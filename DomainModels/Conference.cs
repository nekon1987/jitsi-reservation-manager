using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JitsiReservationManager.DomainModels
{
    public class Conference
    {
        public string RoomName { get; set; }
        public string RoomOwnerIdentifier { get; set; }
        public DateTime? StartTime { get; set; }
        public TimeSpan ConferenceDuration { get; set; }

        public override string ToString()
        {
            return $"Conference [{RoomName}]";
        }
    }
}
