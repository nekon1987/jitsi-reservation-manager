using System;

namespace JitsiReservationManager.Extensions
{
    public static class DecimalExtensions
    {
        public static string ToStringNoDecimalPlaces(this double value)
        {
            return Convert.ToInt64(value).ToString();
        }
    }
}
