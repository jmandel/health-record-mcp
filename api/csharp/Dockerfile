FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5000
EXPOSE 5001

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["FamilyHealthApi/FamilyHealthApi.csproj", "FamilyHealthApi/"]
RUN dotnet restore "FamilyHealthApi/FamilyHealthApi.csproj"
COPY . .
WORKDIR "/src/FamilyHealthApi"
RUN dotnet build "FamilyHealthApi.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "FamilyHealthApi.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "FamilyHealthApi.dll"]
