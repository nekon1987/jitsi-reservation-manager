using JitsiReservationManager.Configuration;
using JitsiReservationManager.DomainModels;
using JitsiReservationManager.MessageModels.Responses;
using JitsiReservationManager.Extensions;

namespace JitsiReservationManager.Factories
{
    public class JicofoResponseDataFactory
    {
        public JicofoConferenceDataResponse CreateConferenceDataForResponse(Reservation reservation)
        {
            //return new JicofoConferenceDataResponse
            //{
            //    id = 364758328,
            //    name = reservation.Conference.RoomName,
            //    mail_owner = reservation.Conference.RoomOwnerIdentifier,
            //    start_time = "2048-04-20T17:55:12.000Z",
            //    duration = (long) reservation.Conference.ConferenceDuration.TotalSeconds
            //};

            return new JicofoConferenceDataResponse
            {
                id = reservation.Id.ToString(),
                name = reservation.Conference.RoomName,
                mail_owner = reservation.Conference.RoomOwnerIdentifier,
                start_time = reservation.ReservationValidFromDatetime.ToJitsiTimeStringFormat(),
                duration = reservation.Conference.ConferenceDuration.TotalSeconds.ToStringNoDecimalPlaces()
            };
        }
    }
}
