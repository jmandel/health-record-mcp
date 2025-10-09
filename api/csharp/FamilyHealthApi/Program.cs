using FamilyHealthApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Override connection string from environment variable if set
var postgresConnectionString = Environment.GetEnvironmentVariable("OUR_HEALTHS_POSTGRES_CONNECTION_STRING");
if (!string.IsNullOrEmpty(postgresConnectionString))
{
    builder.Configuration["ConnectionStrings:PostgreSQL"] = postgresConnectionString;
}

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.EnableAnnotations();
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Register database service
builder.Services.AddSingleton<IHealthRecordService, HealthRecordService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();
