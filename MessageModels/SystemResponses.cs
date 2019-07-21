
namespace JitsiReservationManager.MessageModels
{
    /// <summary>
    /// Response allowing us to carry success flag with optional content between application layers repositories/cotrollers
    /// </summary>
    public class SystemResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }

        public static SystemResponse Successfull(string message = "")
        {
            return new SystemResponse()
            {
                Message = message,
                Success = true
            };
        }
        public static SystemResponse Error(string message = "")
        {
            return new SystemResponse()
            {
                Message = message,
                Success = false
            };
        }
    }

    public class SystemResponse<TType> : SystemResponse
    {
        public TType Content { get; set; }

        public static SystemResponse<TType> Successfull(TType content, string message = "")
        {
            return new SystemResponse<TType>()
            {
                Message = message,
                Success = true,
                Content = content
            };
        }
        public new static SystemResponse<TType> Error(string message = "")
        {
            return new SystemResponse<TType>()
            {
                Message = message,
                Success = false
            };
        }
    }
}
