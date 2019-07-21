using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JitsiReservationManager.MessageModels.Responses
{
    public class CheckIfReservationExistsAndIsValidResponse
    {
        public bool ReservationWithTheSameRoomNameExists { get; set; }
        public bool ReservationExistsAndIsValidForCurrentTimePeriod { get; set; }
    }
}
