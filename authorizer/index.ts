import { Callback, Context } from "aws-lambda";

const generatePolicy = (principalId, effect, resource) => {
  const authResponse: any = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument: any = {};
    policyDocument.Version = "2012-10-17";
    policyDocument.Statement = [];
    const statementOne: any = {};
    statementOne.Action = "execute-api:Invoke";
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  return authResponse;
};

export const agusPhraseAuthorizer = (
  event: any,
  context: Context,
  callback: Callback<any>
): void => {
  if (!event.headers) {
    return callback("Unauthorized");
  }

  const agusPhrase: string = event.headers["x-agus-phrase"];

  if (agusPhrase !== process.env.AGUS_PHRASE) {
    return callback("You must know the secret Agus Phrase");
  }

  try {
    return callback(null, generatePolicy("01", "Allow", event.methodArn));
  } catch (err) {
    return callback("Unauthorized");
  }
};
