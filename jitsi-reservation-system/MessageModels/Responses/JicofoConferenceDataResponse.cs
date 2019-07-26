namespace JitsiReservationManager.MessageModels.Responses
{
    /// <summary>
    /// This data object is in strict format described by Jicofo manual here: https://github.com/jitsi/jicofo/blob/master/doc/reservation.md
    /// </summary>
    public class JicofoConferenceDataResponse
    {
        public long id { get; set; }
        public string name { get; set; }
        public string mail_owner { get; set; }
        public string start_time { get; set; }
        public long duration { get; set; }
    }
}
