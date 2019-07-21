using JitsiReservationManager.DomainModels;
using JitsiReservationManager.MessageModels;
using log4net;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using JitsiReservationManager.Extensions;
using JitsiReservationManager.MessageModels.Responses;

namespace JitsiReservationManager.Repository
{
    public class ReservationRepository
    {
        private static ConcurrentDictionary<string, Reservation> InMemoryReservations = new ConcurrentDictionary<string, Reservation>();
        private static readonly ILog _logger = LogManager.GetLogger(MethodBase.GetCurrentMethod().DeclaringType);

        public SystemResponse<Reservation> Store(Reservation reservation)
        {
            try
            {
                var succesfullyAddedReservation = InMemoryReservations.TryAdd(reservation.Conference.RoomName, reservation);

                if (succesfullyAddedReservation)
                    return SystemResponse<Reservation>.Successfull(reservation);
                else
                {
                    var roomNameAlreadyExists = LoadByRoomName(reservation.Conference.RoomName).Content != null;
                    var errorMessage = $"Unable to store reservation: {reservation}.";

                    if (roomNameAlreadyExists)
                        errorMessage += " Reservation already exists.";

                    return SystemResponse<Reservation>
                        .Error(errorMessage)
                        .LogError(_logger);
                }
            }
            catch (Exception ex)
            {
                return SystemResponse<Reservation>
                    .Error($"Unable to store reservation: {reservation}.")
                    .LogError(_logger, ex);
            }
        }

        public SystemResponse<CheckIfReservationExistsAndIsValidResponse> CheckIfReservationExistsAndIsValid(string roomName, ref Reservation outputExisitngReservation)
        {
            try
            {
                var reservationExistsAndIsValidForCurrentTimePeriod = false;
                var meetingExistsButHasAlreadyStartedSoPossibleConflictDetected = false;

                var existingRoomReservation = InMemoryReservations.Values
                   .SingleOrDefault(reservation => reservation.Conference.RoomName
                   .Equals(roomName, StringComparison.OrdinalIgnoreCase));


                if (existingRoomReservation != null) 
                {
                    reservationExistsAndIsValidForCurrentTimePeriod = DateTime.Now
                        .IsInRange(
                            from: existingRoomReservation.ReservationValidFromDatetime,
                            to: existingRoomReservation.ReservationExpirationDateTime);                        
                      
                    if (existingRoomReservation.MeetingHasStarted)
                        meetingExistsButHasAlreadyStartedSoPossibleConflictDetected = true;

                    if (reservationExistsAndIsValidForCurrentTimePeriod)
                    {
                        existingRoomReservation.Conference.StartTime = DateTime.Now;
                        outputExisitngReservation = existingRoomReservation;
                    }
                }                

                return SystemResponse<CheckIfReservationExistsAndIsValidResponse>.Successfull(new CheckIfReservationExistsAndIsValidResponse()
                {
                    ReservationWithTheSameRoomNameExists = meetingExistsButHasAlreadyStartedSoPossibleConflictDetected,
                    ReservationExistsAndIsValidForCurrentTimePeriod = reservationExistsAndIsValidForCurrentTimePeriod
                });
            }
            catch (Exception ex)
            {
                return SystemResponse<CheckIfReservationExistsAndIsValidResponse>
                   .Error($"Failed to check reservation for room: {roomName}.")
                   .LogError(_logger, ex);
            }
           
        }

        public SystemResponse<List<Reservation>> LoadAll()
        {
            try
            {
                var allReservations = InMemoryReservations.Values.ToList();
                return SystemResponse<List<Reservation>>.Successfull(allReservations);
            }
            catch (Exception ex)
            {
                return SystemResponse<List<Reservation>>
                   .Error("Failed to load all reservations.")
                   .LogError(_logger, ex);
            }
        }

        public SystemResponse<Reservation> LoadByRoomName(string roomName)
        {
            try
            {
                var roomReservation = InMemoryReservations.Values
                     .SingleOrDefault(reservation => reservation.Conference.RoomName
                     .Equals(roomName, StringComparison.OrdinalIgnoreCase));

                if (roomReservation != null)
                    return SystemResponse<Reservation>.Successfull(roomReservation);
                else
                    return SystemResponse<Reservation>
                        .Error($"Unable to locate a reservation for room: {roomName}")
                        .LogError(_logger);
            }
            catch (Exception ex)
            {
                return SystemResponse<Reservation>
                       .Error($"Unable to locate a reservation for room: {roomName}")
                       .LogError(_logger, ex);
            }     
        }

        public SystemResponse<Reservation> LoadByConferenceGuid(Guid conferenceGuid)
        {
            try
            {
                var roomReservation = InMemoryReservations.Values
                     .SingleOrDefault(reservation => reservation.Id == conferenceGuid);

                if (roomReservation != null)
                    return SystemResponse<Reservation>.Successfull(roomReservation);
                else
                    return SystemResponse<Reservation>
                        .Error($"Unable to locate a reservation for room: {conferenceGuid}")
                        .LogError(_logger);
            }
            catch (Exception ex)
            {
                return SystemResponse<Reservation>
                       .Error($"Unable to locate a reservation for room: {conferenceGuid}")
                       .LogError(_logger, ex);
            }
        }

        public SystemResponse Delete(string roomName)
        {
            try
            {
                Reservation reservation = null;
                var succesfullyRemovedReseravion = InMemoryReservations.TryRemove(roomName, out reservation);

                if (succesfullyRemovedReseravion)
                    return SystemResponse.Successfull();
                else
                    return SystemResponse
                        .Error($"Unable to remove reservation for room: {roomName}.")
                        .LogError(_logger);
            }
            catch (Exception ex)
            {
                return SystemResponse
                    .Error($"Unable to store reservation for room: {roomName}.")
                    .LogError(_logger, ex);
            }
        }

        public SystemResponse Delete(Guid reservationGuid)
        {
            try
            {
                var existingReservation = InMemoryReservations.Values.SingleOrDefault(reservation => reservation.Id == reservationGuid);

                Reservation dummy = null;
                if (existingReservation != null && InMemoryReservations.TryRemove(existingReservation.Conference.RoomName, out dummy))
                    return SystemResponse.Successfull();
                else
                    return SystemResponse
                        .Error($"Unable to remove reservation: {reservationGuid}.")
                        .LogError(_logger);
            }
            catch (Exception ex)
            {
                return SystemResponse
                    .Error($"Unable to store reservation: {reservationGuid}.")
                    .LogError(_logger, ex);
            }
        }
    }
}
