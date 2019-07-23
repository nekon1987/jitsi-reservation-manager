using System;
using System.Collections.Generic;
using System.Linq;
using JitsiReservationManager.MessageModels.Requests;

namespace JitsiReservationManager.Validation
{
    public class ReservationValidation
    {
        public bool ValidateGetReservation(string roomName, out List<string> validationErrors)
        {
            validationErrors = new List<string>();

            if (string.IsNullOrEmpty(roomName) || string.IsNullOrWhiteSpace(roomName))
                validationErrors.Add("Room name cannot be empty");
            if (!Uri.IsWellFormedUriString(roomName, UriKind.RelativeOrAbsolute))
                validationErrors.Add("Room name cannot contain any illegal characters - set of valid characters is as follows: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=");

            return !validationErrors.Any();
        }

        internal bool ValidatePostReservation(CreateReservation createReservation, out List<string> validationErrors)
        {
            validationErrors = new List<string>();

            if (string.IsNullOrEmpty(createReservation.RoomName) || string.IsNullOrWhiteSpace(createReservation.RoomName))
                validationErrors.Add("Room name cannot be empty");
            if (!Uri.IsWellFormedUriString(createReservation.RoomName, UriKind.RelativeOrAbsolute))
                validationErrors.Add("Room name cannot contain any illegal characters - set of valid characters is as follows: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=");

            return !validationErrors.Any();
        }

        public bool ValidateDeleteReservation(string roomName, out List<string> validationErrors)
        {
            validationErrors = new List<string>();

            if (string.IsNullOrEmpty(roomName) || string.IsNullOrWhiteSpace(roomName))
                validationErrors.Add("Room name cannot be empty");
            if (!Uri.IsWellFormedUriString(roomName, UriKind.RelativeOrAbsolute))
                validationErrors.Add("Room name cannot contain any illegal characters - set of valid characters is as follows: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=");

            return !validationErrors.Any();
        }
    }
}
