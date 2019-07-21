using JitsiReservationManager.DomainModels;
using JitsiReservationManager.MessageModels.Responses;
using JitsiReservationManager.Extensions;
using System;

namespace JitsiReservationManager.Factories
{
    public class JicofoResponseDataFactory
    {
        /// <summary>
        /// This data object is in strict format described by Jicofo manual here: https://github.com/jitsi/jicofo/blob/master/doc/reservation.md
        /// </summary>
        public JicofoConferenceDataResponse CreateConferenceDataForResponse(Reservation reservation)
        {            
            return new JicofoConferenceDataResponse
            {
                id = reservation.Id,
                name = reservation.Conference.RoomName,
                mail_owner = reservation.Conference.RoomOwnerIdentifier,
                start_time = reservation.ReservationValidFromDatetime.ToJitsiTimeStringFormat(),
                duration = Convert.ToInt64(reservation.Conference.ConferenceDuration.TotalSeconds)
            };
        }
    }
}
