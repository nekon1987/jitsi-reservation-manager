using System.Collections.Generic;
using System.Reflection;
using JitsiReservationManager.Factories;
using JitsiReservationManager.MessageModels.Requests;
using JitsiReservationManager.Repository;
using JitsiReservationManager.Validation;
using log4net;
using Microsoft.AspNetCore.Mvc;

namespace JitsiReservationManager.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReservationController : ControllerBase
    {
        private static readonly HttpResponsesFactory _httpResponsesFactory = new HttpResponsesFactory();
        private static readonly ReservationsFactory _reservationsFactory = new ReservationsFactory();
        private static readonly ReservationRepository _reservationRepository = new ReservationRepository();
        private static readonly ReservationValidation _reservationValidation = new ReservationValidation();
        private static readonly ILog _logger = LogManager.GetLogger(MethodBase.GetCurrentMethod().DeclaringType);

        // GET: api/Reservation
        [HttpGet]
        public JsonResult Get()
        {
            _logger.Debug($"Get request received");

            var loadAllRoomsResult = _reservationRepository.LoadAll();
            if (loadAllRoomsResult.Success)
                return _httpResponsesFactory.CreateSuccessResponseWithData(loadAllRoomsResult.Content);
            else
                return _httpResponsesFactory.CreateInternalServerErrorWithMessage(loadAllRoomsResult.Message);
        }

        // GET: api/Reservation/OurFirstCoolReservation
        [HttpGet("{roomName}")]
        public JsonResult Get(string roomName)
        {
            _logger.Debug($"Get request received for room: {roomName}");

            List<string> validationErrors;
            if (_reservationValidation.ValidateGetReservation(roomName, out validationErrors) == false)
                return _httpResponsesFactory.CreateFailedRequestValidationResponse(validationErrors);

            var loadByRoomNameResult = _reservationRepository.LoadByRoomName(roomName);
            if (loadByRoomNameResult.Success)
            {
                if(loadByRoomNameResult.Content != null)
                    return _httpResponsesFactory.CreateSuccessResponseWithData(loadByRoomNameResult.Content);
                else
                    return _httpResponsesFactory.CreateNotFoundResponseWithMessage($"Unable to find room: {roomName}");
            }
            else
                return _httpResponsesFactory.CreateInternalServerErrorWithMessage(loadByRoomNameResult.Message);
        }

        // POST: api/Reservation
        [HttpPost]
        public JsonResult Post([FromForm] CreateReservation request)
        {
            _logger.Debug($"CreateReservation request received: {request}");

            List<string> validationErrors;
            if (_reservationValidation.ValidatePostReservation(request, out validationErrors) == false)
                 return _httpResponsesFactory.CreateFailedRequestValidationResponse(validationErrors);

            var newReservation = _reservationsFactory.Create(
                request.RoomName, 
                request.RoomOwnerIdentifier,
                request.ReservationValidFromDatetime, 
                request.ReservationExpirationDateTime,
                request.ConferenceDurationInSeconds);

            var storeReservationResult = _reservationRepository.Store(newReservation);

            if (storeReservationResult.Success)
                return _httpResponsesFactory.CreateSuccessResponseWithData(storeReservationResult.Content);
            else
                return _httpResponsesFactory.CreateInternalServerErrorWithMessage(storeReservationResult.Message);
        }

        // DELETE: api/Reservation/OurFirstCoolReservation
        [HttpDelete("{roomName}")]
        public JsonResult Delete(string roomName)
        {
            _logger.Debug($"Delete request received for room: {roomName}");

            List<string> validationErrors;
            if (_reservationValidation.ValidateDeleteReservation(roomName, out validationErrors) == false)
                return _httpResponsesFactory.CreateFailedRequestValidationResponse(validationErrors);

            var deleteReservationResult = _reservationRepository.Delete(roomName);
            if (deleteReservationResult.Success)
                return _httpResponsesFactory.CreateSuccessResponse();
            else
                return _httpResponsesFactory.CreateInternalServerErrorWithMessage(deleteReservationResult.Message);
        }
    }
}
