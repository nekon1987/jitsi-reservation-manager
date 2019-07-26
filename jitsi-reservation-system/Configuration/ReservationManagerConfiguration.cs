using System;

namespace JitsiReservationManager.Configuration
{ 
    public static class ReservationManagerConfiguration
    {
        /// <summary>
        /// If no espiration value is provided in reservation creation request - we will use this value so that reservations do not sit in datastore forever
        /// </summary>
        public static TimeSpan DefaultReservationExpirationOffset
        {
            get { return TimeSpan.FromDays(8); }
        }

        /// <summary>
        /// If no duration value is provided in reservation creation request - we will use this value which will be passed to Jitsi if requested
        /// </summary>
        public static TimeSpan DefaultConferenceDuration
        {
            get { return TimeSpan.FromMinutes(90); }
        }

        /// <summary>
        /// This format is specified as per Jitsi manual
        /// </summary>
        public static string JitsiDateTimeFormat
        {
            get { return "yyyy-MM-dd'T'HH:mm:ss.fffZ"; }
        }

        /// <summary>
        /// Currently its a MySql database connection string
        /// </summary>
        public static string ConnectionString
        {
            get { return "server=52.34.162.204;user=jitsi;database=jitsiapi;port=3306;password=jitsi@123"; }
        }
    }
}
