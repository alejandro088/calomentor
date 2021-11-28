import type { APIGatewayProxyHandler } from "aws-lambda";

import { Callback, Context } from "aws-lambda";
import type { AWSError } from "aws-sdk";
import { TABLE_NAME_USER } from "../constants";
import {
  createUser,
  getUsers,
  getUserById,
  deleteUserById,
} from "../repository/user";
import type { User } from "../types";
import { makeErrorResponse, makeSuccessResponse } from "../utils/makeResponses";
import { throwResponse } from "../utils/throwResponse";

const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
let responseMessage = "";

function isAWSError(error: any): error is AWSError {
  return error?.code;
}

export const createUserService: APIGatewayProxyHandler = async (event) => {
  const {
    id,
    discord_username,
    full_name,
    about_me,
    email,
    url_photo,
    role,
    links,
    skills,
  } = JSON.parse(event.body);

  if (!id || typeof id !== "string") {
    return makeErrorResponse(400, "-315");
  }

  const user: User = {
    id,
    discord_username,
    full_name,
    about_me,
    email,
    url_photo,
    role,
    links,
    skills,
    isActive: false,
    lastActivateBy: "",
    timezone: "25",
  };

  try {
    await createUser(user);
  } catch (error: unknown) {
    if (isAWSError(error)) {
      if (error?.code === "ConditionalCheckFailedException") {
        return makeErrorResponse(400, "-200", error);
      }
    }

    return makeErrorResponse(400, "-201", error);
  }

  return makeSuccessResponse(user);
};

export const getUsersService: APIGatewayProxyHandler = async () => {
  let mentors: User[];

  try {
    const mentorsData = await getUsers({ role: "mentor" });
    mentors = mentorsData.Items;
  } catch (error) {
    return makeErrorResponse(400, "-203", error);
  }

  if (mentors.length === 0) {
    return makeErrorResponse(404, "-202");
  }

  return makeSuccessResponse(mentors);
};

export const getUserByIdService: APIGatewayProxyHandler = async (event) => {
  const id = event?.pathParameters?.id;

  if (!id) {
    return makeErrorResponse(400, "-311");
  }

  let user: User;
  try {
    const userData = await getUserById(event.pathParameters.id);
    user = userData.Item;
  } catch (error) {
    return makeErrorResponse(400, "-205", error);
  }

  if (!user) {
    return makeErrorResponse(404, "-204");
  }

  return makeSuccessResponse(user);
};

export const deleteUserByIdService: APIGatewayProxyHandler = async (event) => {
  const id = event?.pathParameters?.id;

  if (!id) {
    return makeErrorResponse(400, "-311");
  }

  let user: User;
  try {
    const userData = await deleteUserById(event.pathParameters.id);
    user = userData.Attributes;
  } catch (error) {
    return makeErrorResponse(500, "-316", error);
  }

  if (!user) {
    return makeErrorResponse(404, "-204");
  }

  return makeSuccessResponse(user, "202");
};

export const updateUserByIdService = (
  event: any,
  context: Context,
  callback: Callback<any>
): void => {
  const data = JSON.parse(event.body);

  const generateUpdateQuery = (fields) => {
    const allowedFieldsToUpdate = [
      "discord_username",
      "full_name",
      "about_me",
      "email",
      "url_photo",
      "role",
      "links",
      "skills",
      "timezone",
    ];

    let expression = {
      UpdateExpression: "set",
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
    };

    Object.entries(fields).forEach(([key, item]) => {
      if (allowedFieldsToUpdate.includes(key)) {
        expression.UpdateExpression += ` #${key} = :${key},`;
        expression.ExpressionAttributeNames[`#${key}`] = key;
        expression.ExpressionAttributeValues[`:${key}`] = item;
      }
    });

    expression.UpdateExpression = expression.UpdateExpression.slice(0, -1);

    if (Object.keys(expression.ExpressionAttributeNames).length === 0) {
      responseMessage = "Bad Request: no valid fields to update.";
      return throwResponse(callback, responseMessage, 400);
    } else return expression;
  };

  let updateExpression = generateUpdateQuery(data);

  const params = {
    TableName: TABLE_NAME_USER,
    Key: { id: event.pathParameters.id },
    ConditionExpression: "attribute_exists(id)",
    ReturnValues: "ALL_NEW",
    ...updateExpression,
  };

  dynamoDb.update(params, (error, data) => {
    if (error) {
      if (error.code === "ConditionalCheckFailedException") {
        responseMessage = `Unable to update user. Id ${event.pathParameters.id} not found`;
        throwResponse(callback, responseMessage, 404);
      }
      responseMessage = `Unable to update user. Error: ${error}`;
      throwResponse(callback, responseMessage, 400);
    } else {
      responseMessage = `User with id ${event.pathParameters.id} updated succesfully.`;
      throwResponse(callback, responseMessage, 200, data.Attributes);
    }
  });
};

export const activateUserService = (
  event: any,
  context: Context,
  callback: Callback<any>
): void => {
  const { isActive, lastActivateBy } = JSON.parse(event.body);

  if (typeof isActive !== "boolean" && lastActivateBy) {
    responseMessage =
      "Bad Request: isActive property is missing or is not allowable option.";
    return throwResponse(callback, responseMessage, 400);
  }

  const params = {
    TableName: TABLE_NAME_USER,
    Key: {
      id: event.pathParameters.id,
    },
    ExpressionAttributeValues: {
      ":isActive": isActive,
      ":lastActivateBy": lastActivateBy,
    },
    ConditionExpression: "attribute_exists(id)",
    UpdateExpression:
      "SET isActive = :isActive, lastActivateBy = :lastActivateBy",
    ReturnValues: "ALL_NEW",
  };

  dynamoDb.update(params, (error, data) => {
    if (error) {
      if (error.code === "ConditionalCheckFailedException") {
        responseMessage = `Unable to activate user. Id ${event.pathParameters.id} not found`;
        throwResponse(callback, responseMessage, 404);
      }
      (responseMessage = `Unable to activate user. Error: ${error}`),
        throwResponse(callback, responseMessage, 400);
    } else {
      responseMessage = `User with id ${event.pathParameters.id} activated succesfully.`;
      throwResponse(callback, responseMessage, 200, data.Attributes);
    }
  });
};
