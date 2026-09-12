using System.Text;
using DBHub.Api.Data;
using DBHub.Api.Infrastructure;
using DBHub.Api.Models.Auth;
using DBHub.Api.Repositories;
using DBHub.Api.Services;
using DBHub.Api.Services.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// 1. Serilog Setup
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}");
});

// 2. Ensure App_Data Directory exists
var dataDir = Path.Combine(builder.Environment.ContentRootPath, "App_Data");
if (!Directory.Exists(dataDir))
{
    Directory.CreateDirectory(dataDir);
}

// 3. EF Core DbContext for internal DBHub Database (SQLite)
var internalDbConnStr = builder.Configuration.GetConnectionString("DBHubInternal")
    ?? $"Data Source={Path.Combine(dataDir, "dbhub.db")}";
builder.Services.AddDbContext<DBHubDbContext>(options =>
{
    options.UseSqlite(internalDbConnStr);
});

// 4. Identity Password Hasher
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

// 5. JWT Authentication & Authorization
var jwtKey = builder.Configuration["Jwt:Key"] ?? "DBHub_Enterprise_Secure_Key_2026_Min256Bits_MustBeLongEnough!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "DBHub";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "DBHubClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 6. Add MVC Controllers with Global Exception Filter
builder.Services.AddControllers(options =>
{
    options.Filters.Add<GlobalExceptionFilter>();
});

// 7. Swagger / OpenAPI Documentation with Bearer Token support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "DBHub Enterprise API",
        Version = "v1",
        Description = "ASP.NET Core Web API for SQL Server Enterprise Database Management (Phase 3 Authentication + RBAC)"
    });

    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    };

    c.AddSecurityDefinition("Bearer", securityScheme);

    c.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer"),
            new List<string>()
        }
    });
});

// 8. Memory Cache for metadata & permissions
builder.Services.AddMemoryCache();

// 9. CORS Configuration
var allowedOrigins = builder.Configuration.GetSection("AllowedCorsOrigins").Get<string[]>() ??
[
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
];

builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 10. Dependency Injection Registrations
builder.Services.AddSingleton<IDatabaseConnectionStore, JsonDatabaseConnectionStore>();
builder.Services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
builder.Services.AddScoped<ISqlServerMetadataService, SqlServerMetadataService>();
builder.Services.AddScoped<ITableDataQueryService, TableDataQueryService>();

// Auth Services
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IRefreshTokenService, RefreshTokenService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IAuditService, AuditService>();

var app = builder.Build();

// 11. Database & Seed Initialization
await DbInitializer.InitializeAsync(app.Services);

// 12. HTTP Request Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "DBHub Enterprise API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseSerilogRequestLogging();
app.UseCors("DefaultCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
