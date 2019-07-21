using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JitsiReservationManager.Requests
{
    /// <summary>
    /// Bellow parameter names is as per Jifco interface requirements 
    /// Jifco will call our endpoint with these parameters so that we can allow or dissallow conference creation
    /// </summary>
    public class CheckIfConferenceExists
    {
        /// <summary>
        /// Requested room name
        /// </summary>
        public string name { get; set; }

        /// <summary>
        /// Conference start time
        /// </summary>
        public string start_time { get; set; }

        /// <summary>
        /// This will be filled with email address if authentication is enabled in Jitsi configuration
        /// </summary>
        public string mail_owner { get; set; }

        public override string ToString()
        {
            return $"JicofoRequest [{name}|{start_time}|{mail_owner}]";
        }
    }
}
