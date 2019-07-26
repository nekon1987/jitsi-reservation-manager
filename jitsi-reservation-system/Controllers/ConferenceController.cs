using JitsiReservationManager.DomainModels;
using JitsiReservationManager.Factories;
using JitsiReservationManager.Repository;
using JitsiReservationManager.Requests;
using log4net;
using Microsoft.AspNetCore.Mvc;
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
        private static readonly ILog _logger = LogManager.GetLogger(MethodBase.GetCurrentMethod().DeclaringType);

        /// <summary>
        /// This method is an http handler for Jicofo call. It is an extension point allowing or disallowing creation of a conference by the Jitsi server. 
        /// We allow Jitsi to create conference if a reservation was made prior to this call via Reservation endpoint (JitsiReservationManager/api/reservation).
        /// You can find information about the Jicofo component integration here: https://github.com/jitsi/jicofo/blob/master/doc/reservation.md
        /// </summary>
        /// <param name="request">request containing among others, roomName for which Jitsi is trying to create a conference,
        /// request is fully populated by Jifoco module of Jitsi platform</param>
        /// <returns>200 if reservation exists and 403 if reservation was not found and 409 if conflict is detected (conflicts are checked by room name)</returns>
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
                else if (checkIfReservationExistsAndIsValidsResult.Content.ReservationExistsAndIsValidForCurrentTimePeriod)
                {
                    _logger.Info($"Reservation query found a valid reservation");
                    var successResponseData = _jicofoResponseDataFactory.CreateConferenceDataForResponse(existingReservationWithTheSameName);
                    return _httpResponsesFactory.CreateSuccessResponseWithData(successResponseData);
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

        /// <summary>
        /// Jicofo will call this endpoint whenever it detects conflict (it checks conflicts by room name) - it will query us to get information about conflicting meeting
        /// </summary>
        /// <param name="reservationId">Id assigned earlier by this system</param>
        // GET: api/Conference/1987
        [HttpGet("{reservationId}")]
        public JsonResult Get(long reservationId)
        {
            _logger.Debug($"Get request received for reservation: {reservationId}");

            var loadByRoomNameResult = _reservationRepository.LoadByReservationId(reservationId);
            if (loadByRoomNameResult.Success)
            {
                if (loadByRoomNameResult.Content != null)
                {
                    var successResponseData = _jicofoResponseDataFactory.CreateConferenceDataForResponse(loadByRoomNameResult.Content);
                    return _httpResponsesFactory.CreateSuccessResponseWithData(successResponseData);
                }
                else
                    return _httpResponsesFactory.CreateNotFoundResponseWithMessage($"Unable to find room: {reservationId}");
            }
            else
                return _httpResponsesFactory.CreateInternalServerErrorWithMessage(loadByRoomNameResult.Message);
        }

        /// <summary>
        /// Jicofo will call this endpoint whenever meeting has expired or all parties has disconnected (this allows us to do some cleanup)
        /// </summary>
        /// <param name="reservationId">Id assigned earlier by this system</param>
        // DELETE: api/Conference/1987
        [HttpDelete("{reservationId}")]
        public JsonResult Delete(long reservationId)
        {
            _logger.Debug($"Delete request received for reservation: {reservationId} - deleting is now disabled via conference endpoint, use reservation endpoint");
            return _httpResponsesFactory.CreateSuccessResponse();
            
            // ------------------------------------------------------------------------
            // Uncomment code bellow to allow jitsi to delete conferences

            //var deleteReservationResult = _reservationRepository.Delete(reservationId);
            //if (deleteReservationResult.Success)
            //    return _httpResponsesFactory.CreateSuccessResponse();
            //else
            //    return _httpResponsesFactory.CreateInternalServerErrorWithMessage(deleteReservationResult.Message);
        }

    }
}

