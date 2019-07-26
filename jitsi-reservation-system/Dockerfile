FROM microsoft/dotnet:2.2-sdk as build

ARG BUILDCONFIG=BuildForDocker
ARG VERSION=1.0.0

COPY JitsiReservationManager.csproj /build/

RUN dotnet restore ./build/JitsiReservationManager.csproj

COPY . ./build/
WORKDIR /build/
RUN dotnet publish ./JitsiReservationManager.csproj -c $BUILDCONFIG -o out /p:Version=$VERSION

FROM microsoft/dotnet:2.2-aspnetcore-runtime
WORKDIR /app

COPY --from=build /build/out .

ENTRYPOINT ["dotnet", "JitsiReservationManager.dll"] 