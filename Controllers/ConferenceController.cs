using JitsiReservationManager.DomainModels;
using JitsiReservationManager.Factories;
using JitsiReservationManager.Repository;
using JitsiReservationManager.Requests;
using JitsiReservationManager.Validation;
using log4net;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Reflection;

namespace JitsiReservationManager.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConferenceController : ControllerBase
    {
        private static readonly HttpResponsesFactory _httpResponsesFactory = new HttpResponsesFactory();
        private static readonly ReservationRepository _reservationRepository = new ReservationRepository();
        private static readonly JicofoResponseDataFactory _jicofoResponseDataFactory = new JicofoResponseDataFactory();
        private static readonly ConferenceValidation _conferenceValidation = new ConferenceValidation();
        private static readonly ILog _logger = LogManager.GetLogger(MethodBase.GetCurrentMethod().DeclaringType);

        /// <summary>
        /// This method is an http handler for Jicofo call. It is an extension point allowing or disallowing creation of a conference by the Jitsi server. 
        /// We allow Jitsi to create conference if a reservation was made prior to this call via Reservation endpoint (JitsiReservationManager/api/reservation).
        /// You can find information about the Jicofo component integration here: https://github.com/jitsi/jicofo/blob/master/doc/reservation.md
        /// </summary>
        /// <param name="request">request containing among others, roomName for which Jitsi is trying to create a conference,
        /// request is fully populated by Jifoco module of Jitsi platform</param>
        /// <returns>200 if reservation exists and 403 if reservation was not found</returns>
        // POST: api/Conference
        [HttpPost]
        public JsonResult Post([FromForm]CheckIfConferenceExists request)
        {
            _logger.Debug($"Request received: {request}");

            Reservation existingReservationWithTheSameName = null;
            var checkIfReservationExistsAndIsValidsResult = _reservationRepository.CheckIfReservationExistsAndIsValid(request.name, ref existingReservationWithTheSameName);
            
            if (checkIfReservationExistsAndIsValidsResult.Success)
            {
                _logger.Info($"Reservation query completed succesfully");
                if (checkIfReservationExistsAndIsValidsResult.Content.ReservationWithTheSameRoomNameExists)
                {
                    _logger.Info($"Reservation query found conflicting conference");
                    var successResponseData = _jicofoResponseDataFactory.CreateConferenceDataForResponse(existingReservationWithTheSameName);
                    return _httpResponsesFactory.CreateConflictResponseWithData(successResponseData);
                }
                else if(checkIfReservationExistsAndIsValidsResult.Content.ReservationExistsAndIsValidForCurrentTimePeriod)
                {
                    _logger.Info($"Reservation query found a valid reservation");
                    var successResponseData = _jicofoResponseDataFactory.CreateConferenceDataForResponse(existingReservationWithTheSameName);
                    return _httpResponsesFactory.CreateSuccessResponse();

                    // why this fails????? manual states we have to return this data
                    // return _httpResponsesFactory.CreateSuccessResponseWithData(successResponseData);
                }  
                else
                {
                    _logger.Info($"Reservation query did not return any valid reservation");
                    return _httpResponsesFactory.CreateForbidenResponseWithMessage(
                        "Unable to create room, you have to make a reservation first.");
                }
            }
            
            _logger.Info($"Reservation query completed with error");
            return _httpResponsesFactory.CreateForbidenResponseWithMessage(
                "There is a problem with our conference reservation system, please contact our IT support.");            
        }

        // GET: api/Conference/233ae591-e86b-47a2-8ebc-56989d845245
        [HttpGet("{reservationGuid}")]
        public JsonResult Get(string reservationGuid)
        {
            _logger.Debug($"Get request received for reservation: {reservationGuid}");
            List<string> validationErrors;
            if (_conferenceValidation.ValidateGetReservation(reservationGuid, out validationErrors) == false)
                _httpResponsesFactory.CreateFailedRequestValidationResponse(validationErrors);

            var loadByRoomNameResult = _reservationRepository.LoadByConferenceGuid(Guid.Parse(reservationGuid));
            if (loadByRoomNameResult.Success)
            {
                if (loadByRoomNameResult.Content != null)
                {
                    var successResponseData = _jicofoResponseDataFactory.CreateConferenceDataForResponse(loadByRoomNameResult.Content);
                    return _httpResponsesFactory.CreateSuccessResponseWithData(successResponseData);
                }
                else
                    return _httpResponsesFactory.CreateNotFoundResponseWithMessage($"Unable to find room: {reservationGuid}");
            }
            else
                return _httpResponsesFactory.CreateInternalServerErrorWithMessage(loadByRoomNameResult.Message);
        }


        // DELETE: api/Conference/233ae591-e86b-47a2-8ebc-56989d845245
        [HttpDelete("{roomName}")]
        public JsonResult Delete(string reservationGuid)
        {
            _logger.Debug($"Delete request received for reservation: {reservationGuid}");

            List<string> validationErrors;
            if (_conferenceValidation.ValidateDeleteReservation(reservationGuid, out validationErrors) == false)
                _httpResponsesFactory.CreateFailedRequestValidationResponse(validationErrors);

            var deleteReservationResult = _reservationRepository.Delete(reservationGuid);
            if (deleteReservationResult.Success)
                return _httpResponsesFactory.CreateSuccessResponse();
            else
                return _httpResponsesFactory.CreateInternalServerErrorWithMessage(deleteReservationResult.Message);
        }

    }
}

