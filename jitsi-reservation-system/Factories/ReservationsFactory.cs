using JitsiReservationManager.Configuration;
using JitsiReservationManager.DomainModels;
using System;

namespace JitsiReservationManager.Factories
{
    public class ReservationsFactory
    {
        /// <summary>
        /// Create new instance of reservation for a room which can be used by Jitsi users
        /// </summary>
        /// <param name="roomName">Human friendly room name</param>
        /// <param name="roomOwnerIdentifier">Some unique dentifier like email address</param>
        /// <param name="reservationValidFromDatetime">If value will not be provided - defaults from ReservationManagerConfiguration will be used</param>
        /// <param name="reservationExpirationDateTime">If value will not be provided - defaults from ReservationManagerConfiguration will be used</param>
        /// <param name="conferenceDurationInSeconds">If value will not be provided - defaults from ReservationManagerConfiguration will be used</param>
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
