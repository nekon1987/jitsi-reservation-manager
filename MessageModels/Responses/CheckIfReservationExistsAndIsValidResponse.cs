namespace JitsiReservationManager.MessageModels.Responses
{
    public class CheckIfReservationExistsAndIsValidResponse
    {
        public bool ReservationWithTheSameRoomNameExists { get; set; }
        public bool ReservationExistsAndIsValidForCurrentTimePeriod { get; set; }
    }
}
