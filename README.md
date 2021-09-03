# Cycling Routeplanner :bicyclist: :bicyclist: :bicyclist:

[![staging](https://github.com/anyways-open/functional-routeplanner-ovl/actions/workflows/staging.yml/badge.svg)](https://github.com/anyways-open/functional-routeplanner-ovl/actions/workflows/staging.yml)

This is cycling route planner built for the province of East-Flanders, Belgium. It can be customized using URL parameters and uses the ANYWAYS route planning [API](https://docs.anyways.eu/routing-api/) to handle:

- Cycling networks
  - Cycle highways
  - Node networks
  - Regional and city networks
- Multiple routing profiles.

## Screenshots

<img src="https://github.com/anyways-open/functional-routeplanner-ovl/raw/develop/docs/screenshots/screenshot01.png" width="600"/>

## URL parameter customizations

The url parameters are part of the URL hash, example:

`https://staging.anyways.eu/ovl/#map=13.07/3.68746/51.11665&route=bicycle.commute,3.6657184%2C51.1303597/3.66490/51.13139,Witakker%2015%2C%209940%20Evergem/3.65866/51.10168&layers=FS2`

- `map`: The map view with `{zoom}/{longitude}/{latitude}`.
- `route`: The route with the selected profile and the locations `{profile},{point1}/{longitude}/{latitude},{point2}/{longitude}/{latitude}`.
- `layers`: The layers that should be visible/hidden/available with a number where:
  - `0`: Layer is hidden and not available for the user.
  - `1`: Layer is turned on and available for the user.
  - `2`: Layer is turned off and available for the user.  
  With the following layers:
  - `LN`: Local Network (Lokaal Netwerk).
  - `FS`: Cycle Highways (Fietssnelwegen).
  - `BF`: Functional Network (Bovenlokaal Functioneel Netwerk).
  - `GP`: Road Works (GIPOD).
  - `SR`: School routes.  
  Example: `layers=LN2|GP0|SR1`