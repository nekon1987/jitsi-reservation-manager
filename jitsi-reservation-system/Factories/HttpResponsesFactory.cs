﻿using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Net;
using System.Text;

namespace JitsiReservationManager.Factories
{
    /// <summary>
    /// Saving some typing in controllers by providing some common types of responses
    /// </summary>
    public class HttpResponsesFactory
    {
        public JsonResult CreateSuccessResponseWithData<TDataType>(TDataType data)
        {
            var response = new JsonResult(data);
            response.StatusCode = (int)HttpStatusCode.OK;
            return response;
        }
        
        public JsonResult CreateSuccessResponse()
        {
            var response = new JsonResult(null);
            response.StatusCode = (int)HttpStatusCode.OK;
            return response;
        }

        public JsonResult CreateForbidenResponseWithMessage(string message)
        {
            var response = new JsonResult(new { message });
            response.StatusCode = (int)HttpStatusCode.Forbidden;
            return response;
        }
        public JsonResult CreateConflictResponseWithData<TDataType>(TDataType data)
        {
            var response = new JsonResult(data);
            response.StatusCode = (int)HttpStatusCode.Conflict;
            return response;
        }

        public JsonResult CreateNotFoundResponseWithMessage(string message)
        {
            var response = new JsonResult(new { message });
            response.StatusCode = (int)HttpStatusCode.NotFound;
            return response;
        }

        public JsonResult CreateInternalServerErrorWithMessage(string message)
        {
            var response = new JsonResult(new { message });
            response.StatusCode = (int)HttpStatusCode.InternalServerError;
            return response;
        }
        public JsonResult CreateFailedRequestValidationResponse(List<string> validationErrors)
        {
            var stringBuilder = new StringBuilder("Unfortunatley some of the parameters passed in the request did not pass validation checks, bellow is a list of validation errors:");
            stringBuilder.AppendLine();

            foreach (var error in validationErrors)
                stringBuilder.AppendLine(error);            

            var response = new JsonResult(new { message = stringBuilder.ToString() });
            response.StatusCode = (int)HttpStatusCode.BadRequest;
            return response;
        }
    }
}
