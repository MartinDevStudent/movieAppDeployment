import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  BadRequest,
  Ok,
  SchemaError,
  ServerError,
} from "./shared/httpResponses";
import { isValid } from "../shared/validator";

const schema = require("../shared/types.schema.json");
import { FantasyMovieRequest } from "../shared/types";
import { PutCommandInput, PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { sendCreate } from "../shared/dynamoDbHelpers";

export const handler: APIGatewayProxyHandlerV2 = async function (
  event: APIGatewayProxyEventV2
) {
  console.log("Event: ", event);

  try {
    const username = event?.pathParameters?.username;

    if (!username) {
      return BadRequest("Missing username");
    }

    const body = event.body ? JSON.parse(event.body) : undefined;
    const requestTypeName = "FantasyMovieRequest";

    if (body && !isValid(requestTypeName, body)) {
      return SchemaError(schema.definitions[requestTypeName]);
    }

    const fantasyMovie = body;

    const response = await createFantasyMovie(username, fantasyMovie);

    return Ok(response);
  } catch (error: any) {
    console.log(JSON.stringify(error));

    return ServerError(error);
  }
};

async function createFantasyMovie(
  username: string,
  review: FantasyMovieRequest
): Promise<PutCommandOutput> {
  const commandInput = buildCreateReviewCommandInput(username, review);

  const response = await sendCreate(commandInput);

  console.log("Create response: ", response);

  return response;
}

function buildCreateReviewCommandInput(
  username: string,

  fantasyMovie: FantasyMovieRequest
): PutCommandInput {
  return {
    TableName: process.env.TABLE_NAME,
    Item: { ...fantasyMovie, username },
  };
}
