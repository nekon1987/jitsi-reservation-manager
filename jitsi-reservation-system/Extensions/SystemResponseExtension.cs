using JitsiReservationManager.MessageModels;
using log4net;
using System;

namespace JitsiReservationManager.Extensions
{
    /// <summary>
    /// This helper allows us to fluently log errors and return SystemResponse to upper layer, 
    /// both SystemResponse and LogEntry will share error message which saves some typing if nothing else
    /// </summary>
    public static class SystemResponseExtension
    {
        public static SystemResponse LogError(this SystemResponse failedResponse, ILog logger)
        {
            logger.Error(failedResponse.Message);
            return failedResponse;
        }
        public static SystemResponse LogError(this SystemResponse failedResponse, ILog logger, Exception exception)
        {
            logger.Error(failedResponse.Message, exception);
            return failedResponse;
        }
        public static SystemResponse<TType> LogError<TType>(this SystemResponse<TType> failedResponse, ILog logger)
        {
            logger.Error(failedResponse.Message);
            return failedResponse;
        }
        public static SystemResponse<TType> LogError<TType>(this SystemResponse<TType> failedResponse, ILog logger, Exception exception)
        {
            logger.Error(failedResponse.Message, exception);
            return failedResponse;
        }
    }
}
