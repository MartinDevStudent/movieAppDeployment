import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { BadRequest, Ok, ServerError } from "./shared/httpResponses";
import { sendDelete } from "./shared/dynamoDbHelpers";

export const handler: APIGatewayProxyHandlerV2 = async function (
  event: APIGatewayProxyEventV2
) {
  console.log("Event: ", event);

  try {
    const username = event?.pathParameters?.username;
    const title = event?.pathParameters?.title?.split("%20").join(" ");

    if (!username || !title) {
      return BadRequest("Missing username or fantasyMovieId");
    }

    const response = await sendDelete({
      TableName: process.env.TABLE_NAME,
      Key: {
        username: username,
        title: title,
      },
    });

    return Ok(response);
  } catch (error: any) {
    console.log(JSON.stringify(error));

    return ServerError(error);
  }
};
