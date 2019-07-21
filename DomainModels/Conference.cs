using System;

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
