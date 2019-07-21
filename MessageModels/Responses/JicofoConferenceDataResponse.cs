using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JitsiReservationManager.MessageModels.Responses
{
    public class JicofoConferenceDataResponse
    {
        public string id { get; set; }
        public string name { get; set; }
        public string mail_owner { get; set; }
        public string start_time { get; set; }
        public string duration { get; set; }
    }
}
