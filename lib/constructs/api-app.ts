import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
// import { LambdaIntegration, RestApi, Cors } from "aws-cdk-lib/aws-apigateway";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class APIApp extends Construct {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Lambdas
    const demoFn = new NodejsFunction(this, "RESTEndpointFn", {
      architecture: Architecture.ARM_64,
      runtime: Runtime.NODEJS_18_X,
      entry: `${__dirname}/../../lambdas/demo.ts`,
      timeout: Duration.seconds(10),
      memorySize: 128,
    });

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
        allowOrigins: [ "*" ],
      },
    });

    const todoEndpoint = api.root.addResource("todos")
    todoEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(demoFn, { proxy: true }) // AWSIntegration
    );

    this.apiUrl = api.url;
  }
}
