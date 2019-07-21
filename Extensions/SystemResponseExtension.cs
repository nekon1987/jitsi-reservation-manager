using JitsiReservationManager.MessageModels;
using log4net;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace JitsiReservationManager.Extensions
{
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
