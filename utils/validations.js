import { throwResponse } from "./throwResponse";

export const createAndUpdateUserValidations = (
  callback,
  discord_username,
  full_name,
  email,
  url_photo,
  role,
  links,
  skills
) => {
  let errorMessage = "";
  let isValid = true;

  if (!discord_username || typeof discord_username !== "string") {
    errorMessage = "Bad Request: discord_username is required or it's not a string.";
      isValid = false;
  }

  if (!full_name || typeof full_name !== "string") {
    errorMessage = "Bad Request: full_name is required or it's not a string.";
    isValid = false;
  }

  if (!email || typeof email !== "string") {
    errorMessage = "Bad Request: email is required or it's not a string.";
    isValid = false;
  }

  if (!url_photo || typeof url_photo !== "string") {
    errorMessage = "Bad Request: url_photo is required or it's not a string.";
    isValid = false;
  }

  if (!Array.isArray(role) || !role.length ) {
    errorMessage = "Bad Request: role is required or it's not an array.";
    isValid = false;
  }

  if (
    !links ||
    typeof links !== "object" ||
    Array.isArray(links) ||
    Object.keys(links).length === 0
  ) {
    errorMessage = "Bad Request: links is required or it's not an object.";
    isValid = false;
  }

  if (!Array.isArray(skills) || !skills.length ) {
    errorMessage = "Bad Request: skills is required or it's not an array.";
    isValid = false;
  }
  return { isValid, errorMessage };
};
