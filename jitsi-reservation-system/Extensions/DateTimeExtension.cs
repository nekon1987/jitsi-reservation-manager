using JitsiReservationManager.Configuration;
using System;

namespace JitsiReservationManager.Extensions
{
    public static class DateTimeExtension
    {
        public static string ToJitsiTimeStringFormat(this DateTime dateTime)
        {
            return dateTime.ToString(ReservationManagerConfiguration.JitsiDateTimeFormat);
        }

        public static bool IsInRange(this DateTime dateTime, DateTime from, DateTime to)
        {
            return DateTime.Now >= from && DateTime.Now <= to;
        }
    }
}
