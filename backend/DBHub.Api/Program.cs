using DBHub.Api.Infrastructure;
using DBHub.Api.Repositories;
using DBHub.Api.Services;
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

// 2. Add MVC Controllers with Global Exception Filter
builder.Services.AddControllers(options =>
{
    options.Filters.Add<GlobalExceptionFilter>();
});

// 3. Swagger / OpenAPI Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo
    {
        Title = "DBHub Enterprise API",
        Version = "v1",
        Description = "ASP.NET Core Web API for SQL Server Enterprise Database Management (Phase 2 Read-Only Foundation)"
    });
});

// 4. Memory Cache for metadata
builder.Services.AddMemoryCache();

// 5. CORS Configuration
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
        if (builder.Environment.IsDevelopment())
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .WithMethods("GET", "POST", "DELETE", "OPTIONS");
        }
    });
});

// 6. Dependency Injection Registrations
builder.Services.AddSingleton<IDatabaseConnectionStore, JsonDatabaseConnectionStore>();
builder.Services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
builder.Services.AddScoped<ISqlServerMetadataService, SqlServerMetadataService>();
builder.Services.AddScoped<ITableDataQueryService, TableDataQueryService>();

var app = builder.Build();

// 7. HTTP Request Pipeline
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

app.MapControllers();

app.Run();
