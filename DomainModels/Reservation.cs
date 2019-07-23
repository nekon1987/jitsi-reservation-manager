using System;

namespace JitsiReservationManager.DomainModels
{
    public class Reservation
    {
        public long Id { get; set; }
        public DateTime CreatedDateTime { get; set; }
        public Conference Conference { get; set; }

        /// <summary>
        /// Time before which we will not allow conference to be started
        /// </summary>
        public DateTime ReservationValidFromDatetime { get; internal set; }
        /// <summary>
        /// Time after which we will not allow conference to be started
        /// </summary>
        public DateTime ReservationExpirationDateTime { get; set; }

        public bool MeetingHasStarted
        {
            get { return Conference.StartTime.HasValue; }
        }

        public override string ToString()
        {
            return $"Reservation [{Id}|{CreatedDateTime}|{Conference?.RoomName}]";
        }
    }
}
