using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JitsiReservationManager.MessageModels.Requests
{
    public class CreateReservation
    {
        public string RoomName { get; set; }
        public string RoomOwnerIdentifier { get; set; }

        /// <summary>
        /// Time before which we will not allow conference to be started
        /// </summary>
        public DateTime? ReservationValidFromDatetime { get; internal set; }

        /// <summary>
        /// Time after which we will not allow conference to be started
        /// </summary>
        public DateTime? ReservationExpirationDateTime { get; set; }


        /// <summary>
        /// Estimated duration of the conference
        /// </summary>
        public double? ConferenceDurationInSeconds { get; set; }

        public override string ToString()
        {
            return $"CreateReservation [{RoomName}|{ReservationValidFromDatetime}|{ReservationExpirationDateTime}]";
        }
    }
}
