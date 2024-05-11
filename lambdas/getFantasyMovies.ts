import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { FantasyMovie } from "../shared/types";
import { NotFound, Ok, ServerError } from "./shared/httpResponses";
import { sendQuery } from "../shared/dynamoDbHelpers";

export const handler: APIGatewayProxyHandlerV2 = async function (
  event: APIGatewayProxyEventV2
) {
  console.log("Event: ", event);

  try {
    const username = event?.pathParameters?.username;

    if (!username) {
      return NotFound("Missing username");
    }

    const fantasyMovies = await getFantasyMovies(username);

    if (!fantasyMovies) {
      return NotFound("Movie reviews with specified parameters not found");
    }

    return Ok(fantasyMovies);
  } catch (error: any) {
    console.log(JSON.stringify(error));

    return ServerError(error);
  }
};

async function getFantasyMovies(username): Promise<FantasyMovie[] | undefined> {
  const commandInput = {
    TableName: process.env.TABLE_NAME,
    //IndexName: "ratingIx",
    KeyConditionExpression: "username = :u",
    ExpressionAttributeValues: { ":u": username },
  };

  const queryResponse = await sendQuery(commandInput);

  console.log("GetCommand response: ", queryResponse);

  return queryResponse.Items && queryResponse.Items.length > 0
    ? (queryResponse.Items as FantasyMovie[])
    : undefined;
}
