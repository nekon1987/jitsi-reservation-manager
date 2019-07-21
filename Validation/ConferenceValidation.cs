using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using JitsiReservationManager.MessageModels.Requests;

namespace JitsiReservationManager.Validation
{
    public class ConferenceValidation
    {
        public bool ValidateGetReservation(string reservationGuid, out List<string> validationErrors)
        {
            validationErrors = new List<string>();

            Guid dummy;
            if (!Guid.TryParse(reservationGuid, out dummy))
                validationErrors.Add("reservation guid has to be in the canonical 8-4-4-4-12 format.");
          
            return validationErrors.Any();
        }

        internal bool ValidateDeleteReservation(string reservationGuid, out List<string> validationErrors)
        {
            validationErrors = new List<string>();

            Guid dummy;
            if (!Guid.TryParse(reservationGuid, out dummy))
                validationErrors.Add("reservation guid has to be in the canonical 8-4-4-4-12 format.");

            return validationErrors.Any();
        }
    }
}
