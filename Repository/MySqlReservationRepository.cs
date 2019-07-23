using JitsiReservationManager.DomainModels;
using JitsiReservationManager.MessageModels;
using log4net;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using JitsiReservationManager.Extensions;
using JitsiReservationManager.MessageModels.Responses;
using Microsoft.EntityFrameworkCore;
using JitsiReservationManager.Configuration;

namespace JitsiReservationManager.Repository
{
    public class ReservationRepository : DbContext
    {
        private static readonly ILog _logger = LogManager.GetLogger(MethodBase.GetCurrentMethod().DeclaringType);

        #region db context code
        public DbSet<Reservation> Reservation { get; set; }
        
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.UseMySQL(ReservationManagerConfiguration.ConnectionString);
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Reservation>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CreatedDateTime).IsRequired();
                entity.HasOne(d => d.Conference);
            });

            modelBuilder.Entity<Conference>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RoomName).IsRequired();
            });
        }
        #endregion

        public SystemResponse<Reservation> Store(Reservation reservationToStore)
        {
            try
            {
                using (var context = new ReservationRepository())
                {
                    var roomNameAlreadyExists = context.Reservation
                        .Include(reservation => reservation.Conference)
                        .Any(reservation => reservation.Conference.RoomName
                        .Equals(reservationToStore.Conference.RoomName, StringComparison.OrdinalIgnoreCase));

                    if (roomNameAlreadyExists)
                        return SystemResponse<Reservation>
                            .Error($"Unable to store reservation: {reservationToStore}. Reservation already exists.")
                            .LogError(_logger);
                
                    context.Database.EnsureCreated();
                    context.Add(reservationToStore);
                    context.SaveChanges();
                }
                return SystemResponse<Reservation>.Successfull(reservationToStore);             
            }
            catch (Exception ex)
            {
                return SystemResponse<Reservation>
                    .Error($"Unable to store reservation: {reservationToStore}.")
                    .LogError(_logger, ex);
            }
        }

        public SystemResponse<Reservation> LoadByRoomName(string roomName)
        {
            try
            {
                Reservation roomReservation;
                using (var context = new ReservationRepository())
                {
                    context.Database.EnsureCreated();

                    roomReservation = context.Reservation
                        .Include(reservation => reservation.Conference)
                        .SingleOrDefault(reservation => reservation.Conference.RoomName
                        .Equals(roomName, StringComparison.OrdinalIgnoreCase));
                }
                if (roomReservation != null)
                    return SystemResponse<Reservation>.Successfull(roomReservation);
                else
                    return SystemResponse<Reservation>
                        .Error($"Unable to locate a reservation for room: {roomName}")
                        .LogError(_logger);
            }
            catch (Exception ex)
            {
                return SystemResponse<Reservation>
                       .Error($"Unable to locate a reservation for room: {roomName}")
                       .LogError(_logger, ex);
            }
        }

        public SystemResponse<CheckIfReservationExistsAndIsValidResponse> CheckIfReservationExistsAndIsValid(string roomName, ref Reservation outputExisitngReservation)
        {
            try
            {
                var reservationExistsAndIsValidForCurrentTimePeriod = false;
                var meetingExistsButHasAlreadyStartedSoPossibleConflictDetected = false;
                Reservation existingRoomReservation;

                using (var context = new ReservationRepository())
                {
                    context.Database.EnsureCreated();

                    existingRoomReservation = context.Reservation
                       .Include(reservation => reservation.Conference)
                       .SingleOrDefault(reservation => reservation.Conference.RoomName
                       .Equals(roomName, StringComparison.OrdinalIgnoreCase));
                }

                if (existingRoomReservation != null)
                {
                    reservationExistsAndIsValidForCurrentTimePeriod = DateTime.Now
                        .IsInRange(
                            from: existingRoomReservation.ReservationValidFromDatetime,
                            to: existingRoomReservation.ReservationExpirationDateTime);

                    if (existingRoomReservation.MeetingHasStarted)
                        meetingExistsButHasAlreadyStartedSoPossibleConflictDetected = true;

                    if (reservationExistsAndIsValidForCurrentTimePeriod)
                    {
                        existingRoomReservation.Conference.StartTime = DateTime.Now;
                        outputExisitngReservation = existingRoomReservation;
                    }
                }

                return SystemResponse<CheckIfReservationExistsAndIsValidResponse>.Successfull(new CheckIfReservationExistsAndIsValidResponse()
                {
                    ReservationWithTheSameRoomNameExists = meetingExistsButHasAlreadyStartedSoPossibleConflictDetected,
                    ReservationExistsAndIsValidForCurrentTimePeriod = reservationExistsAndIsValidForCurrentTimePeriod
                });
            }
            catch (Exception ex)
            {
                return SystemResponse<CheckIfReservationExistsAndIsValidResponse>
                   .Error($"Failed to check reservation for room: {roomName}.")
                   .LogError(_logger, ex);
            }

        }

        public SystemResponse<List<Reservation>> LoadAll()
        {
            try
            {
                using (var context = new ReservationRepository())
                {
                    context.Database.EnsureCreated();
                    var allReservations = context.Reservation
                        .Include(reservation => reservation.Conference).ToList();

                    return SystemResponse<List<Reservation>>.Successfull(allReservations);
                }
            }
            catch (Exception ex)
            {
                return SystemResponse<List<Reservation>>
                   .Error("Failed to load all reservations.")
                   .LogError(_logger, ex);
            }
        }
               
        public SystemResponse<Reservation> LoadByReservationId(long reservationId)
        {
            try
            {
                Reservation roomReservation;
                using (var context = new ReservationRepository())
                {
                    context.Database.EnsureCreated();

                    roomReservation = context.Reservation
                        .Include(reservation => reservation.Conference)
                        .SingleOrDefault(reservation => reservation.Id == reservationId);
                }

                if (roomReservation != null)
                    return SystemResponse<Reservation>.Successfull(roomReservation);
                else
                    return SystemResponse<Reservation>
                        .Error($"Unable to locate a reservation: {reservationId}")
                        .LogError(_logger);
            }
            catch (Exception ex)
            {
                return SystemResponse<Reservation>
                       .Error($"Unable to locate a reservation: {reservationId}")
                       .LogError(_logger, ex);
            }
        }

        public SystemResponse Delete(long reservationId)
        {
            try
            {
                using (var context = new ReservationRepository())
                {
                    context.Database.EnsureCreated();
                    var reservationToBeRemoved = context.Reservation
                        .Include(reservation => reservation.Conference)
                        .SingleOrDefault(reservation => reservation.Id == reservationId);

                    if (reservationToBeRemoved != null)
                    {
                        context.Remove(reservationToBeRemoved.Conference);
                        context.Remove(reservationToBeRemoved);
                    }

                    context.SaveChanges();
                }
                return SystemResponse.Successfull();
            }
            catch (Exception ex)
            {
                return SystemResponse
                    .Error($"Unable to store reservation: {reservationId}.")
                    .LogError(_logger, ex);
            }
        }

        public SystemResponse Delete(string roomName)
        {
            try
            {
                using (var context = new ReservationRepository())
                {
                    context.Database.EnsureCreated();
                    var reservationToBeRemoved = context.Reservation
                        .Include(reservation => reservation.Conference)
                        .SingleOrDefault(reservation => string.Equals(reservation.Conference.RoomName, roomName, StringComparison.InvariantCultureIgnoreCase));

                    if (reservationToBeRemoved != null)
                    {
                        context.Remove(reservationToBeRemoved.Conference);
                        context.Remove(reservationToBeRemoved);
                    }

                    context.SaveChanges();
                }
                return SystemResponse.Successfull();
            }
            catch (Exception ex)
            {
                return SystemResponse
                    .Error($"Unable to store reservation for room: {roomName}.")
                    .LogError(_logger, ex);
            }
        }
    }
}
