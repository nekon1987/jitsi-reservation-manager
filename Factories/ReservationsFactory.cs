using JitsiReservationManager.Configuration;
using JitsiReservationManager.DomainModels;
using System;

namespace JitsiReservationManager.Factories
{
    public class ReservationsFactory
    {
        public Reservation Create(string roomName, string roomOwnerIdentifier, DateTime? reservationValidFromDatetime,
            DateTime? reservationExpirationDateTime, double? conferenceDurationInSeconds)
        {
            if (!reservationValidFromDatetime.HasValue)
                reservationValidFromDatetime = DateTime.Now;

            if (!reservationExpirationDateTime.HasValue)
                reservationExpirationDateTime = reservationValidFromDatetime.Value.Add(ReservationManagerConfiguration.DefaultReservationExpirationOffset);

            if (!conferenceDurationInSeconds.HasValue)
                conferenceDurationInSeconds = ReservationManagerConfiguration.DefaultConferenceDuration.TotalSeconds;

            return new Reservation()
            {
                Id = Guid.NewGuid(),
                CreatedDateTime = DateTime.Now,
                ReservationValidFromDatetime = reservationValidFromDatetime.Value,
                ReservationExpirationDateTime = reservationExpirationDateTime.Value,
                Conference = new Conference()
                {
                    RoomName = roomName,
                    RoomOwnerIdentifier = roomOwnerIdentifier,
                    ConferenceDuration = TimeSpan.FromSeconds(conferenceDurationInSeconds.Value)
                }
            };
        }
    }
}
