import { RemovalPolicy } from "aws-cdk-lib";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";

import * as cdk from "aws-cdk-lib";
import * as custom from "aws-cdk-lib/custom-resources";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { movieReviews } from "../../seed/movieReviews";
import { generateBatch } from "../../shared/util";

export class APIApp extends Construct {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Table
    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewerName", type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: "MovieReviews",
    });

    const fantasyMoviesTable = new dynamodb.Table(this, "FantasyMoviesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "username",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: "FantasyMovies",
    });

    movieReviewsTable.addGlobalSecondaryIndex({
      partitionKey: {
        name: "Id",
        type: dynamodb.AttributeType.STRING,
      },
      indexName: "some-index",
    });

    movieReviewsTable.addLocalSecondaryIndex({
      indexName: "reviewDateIx",
      sortKey: { name: "reviewDate", type: dynamodb.AttributeType.STRING },
    });

    movieReviewsTable.addLocalSecondaryIndex({
      indexName: "ratingIx",
      sortKey: { name: "rating", type: dynamodb.AttributeType.NUMBER },
    });

    new custom.AwsCustomResource(this, "movieReviewsddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [movieReviewsTable.tableName]: generateBatch(movieReviews),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of(
          "movieReviewsddbInitData"
        ),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [movieReviewsTable.tableArn],
      }),
    });

    // Functions
    const appCommonFnProps: NodejsFunctionProps = {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: movieReviewsTable.tableName,
        REGION: "eu-west-1",
      },
    };

    const getReviewsByMovieIdFn = new NodejsFunction(
      this,
      "GetReviewsByMovieIdFn",
      {
        ...appCommonFnProps,
        entry: `${__dirname}/../../lambdas/getReviewsByMovieId.ts`,
      }
    );

    const postReviewFn = new NodejsFunction(this, "PostReviewFn", {
      ...appCommonFnProps,
      entry: `${__dirname}/../../lambdas/postReview.ts`,
    });

    const getFantasyMoviesFn = new NodejsFunction(this, "GetFantasyMoviesFn", {
      ...appCommonFnProps,
      entry: `${__dirname}/../../lambdas/getFantasyMovies.ts`,
      environment: {
        TABLE_NAME: fantasyMoviesTable.tableName,
        REGION: "eu-west-1",
      },
    });

    const postFantasyMovieFn = new NodejsFunction(this, "PostFantastMovieFn", {
      ...appCommonFnProps,
      entry: `${__dirname}/../../lambdas/postFantasyMovie.ts`,
      environment: {
        TABLE_NAME: fantasyMoviesTable.tableName,
        REGION: "eu-west-1",
      },
    });

    movieReviewsTable.grantReadData(getReviewsByMovieIdFn);
    movieReviewsTable.grantReadData(postReviewFn);
    movieReviewsTable.grantWriteData(postReviewFn);

    fantasyMoviesTable.grantReadData(getFantasyMoviesFn);
    fantasyMoviesTable.grantWriteData(postFantasyMovieFn);

    // REST API
    const api = new apig.RestApi(this, "DemoAPI", {
      description: "example api gateway",
      endpointTypes: [apig.EndpointType.REGIONAL],
      deployOptions: {
        stageName: "dev",
      },
      // 👇 enable CORS
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    const moviesEndpoint = api.root.addResource("movies");
    const movieIdEndpoint = moviesEndpoint.addResource("{movieId}");

    const reviewsByMovieIdEndpoint = movieIdEndpoint.addResource("reviews");
    reviewsByMovieIdEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getReviewsByMovieIdFn)
    );
    reviewsByMovieIdEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(postReviewFn)
    );

    const fantasyMoviesEndpoint = api.root.addResource("fantasyMovies");
    const username = fantasyMoviesEndpoint.addResource("{username}");

    username.addMethod("GET", new apig.LambdaIntegration(getFantasyMoviesFn));
    username.addMethod("POST", new apig.LambdaIntegration(postFantasyMovieFn));

    this.apiUrl = api.url;
  }
}
