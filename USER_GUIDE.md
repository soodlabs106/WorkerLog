# EM2 Resolve

## What This App Does

EM2 Resolve is a mobile-first maintenance tracking app for a residential community.
It replaces informal WhatsApp-only issue reporting with a shared, structured system.

The app allows residents and community staff to:

- raise maintenance issues quickly
- choose issue type and urgency
- attach the correct reporter and villa
- view suggested service contacts for the selected issue type
- track open and resolved tickets
- monitor dashboard trends for open and resolved work
- manage service contacts through admin tools
- reset user accounts when residents change

The app supports three kinds of users:

- `Villa users`
  - report issues
  - view tickets
  - view dashboard
- `Admin`
  - do everything a normal user can do
  - manage service contacts
- `Superadmin`
  - manage service contacts
  - view user and resident directory
  - reset passwords back to default

## Main App Flow

### 1. Sign In

Users sign in with their assigned account.

- Villa example: `villa-106`
- Admin: `FacilityManager`
- Superadmin: `superadmin`

On first login, villa users are forced to:

1. change their password
2. add resident details

This ensures each villa has a secure login and a usable reporter list.

### 2. Raise a Ticket

From the `New issue` tab, the user can:

1. choose the issue type
2. choose urgency
3. describe the problem
4. select villa or common area
5. select reporter
6. review suggested service contacts
7. copy a WhatsApp-ready message if needed
8. submit the ticket

### 3. Track Tickets

From the `Tickets` tab, users can:

- view all open tickets
- view resolved tickets
- see elapsed time for open work
- resolve issues when appropriate

### 4. Use the Dashboard

From the `Dashboard` tab, users can:

- see total tickets
- see open ticket count
- see average fix time
- filter by month
- filter by service type
- view open vs resolved ticket activity by day
- view average fix time by issue type

## Service Contacts

Suggested service contacts appear automatically when an issue type is selected.

Examples:

- Plumbing -> Plumber contacts
- Electrical -> Electrician contacts
- Snake -> Snake Catcher contacts

Admins and superadmins can manage this list from the admin screen.

They can:

- add a new service contact
- edit an existing contact
- delete a contact
- upload or replace contact photos
- add new service types
- filter contacts by service type

## Password Reset Behavior

Superadmin can reset a villa account back to default state.

When a villa password is reset:

1. password goes back to the default account value
2. the user is forced to change password on next login
3. resident setup is triggered again

This is useful when residents change and the account needs a clean restart.

## User Guide

### For Villa Users

#### Log In

1. Open the app.
2. Enter your villa account name.
3. Enter your password.
4. If this is your first login, change password and add residents.

#### Raise an Issue

1. Open `New issue`.
2. Select issue type.
3. Select urgency.
4. Enter a clear description.
5. Confirm villa and reporter.
6. Review suggested contacts.
7. Tap `Raise ticket`.

#### Create a WhatsApp Message

1. Fill in the issue form.
2. Tap `Create message`.
3. The app copies the message to your device clipboard.
4. Paste it into WhatsApp if you want to send it manually.

#### Track Resolution

1. Open `Tickets`.
2. Review open issues.
3. Check resolved issues when work is completed.

### For Admin

#### Manage Service Contacts

1. Open the `Admin` tab.
2. Use the service filter if needed.
3. Tap `Add service` to create a new contact.
4. Use `Edit` to change service type, role, name, phone, or photo.
5. Use `Delete` to remove a contact.
6. Tap `Save contacts` to apply changes.

#### Use Dashboard Filters

1. Open `Dashboard`.
2. Select a month.
3. Select a service type.
4. Review ticket patterns and resolution trends.

### For Superadmin

#### Reset a Villa Account

1. Open the `Super admin` tab.
2. Find the villa account in the directory.
3. Tap `Reset password`.
4. The account returns to default login state.

#### Review Users

Superadmin can also see:

- villas
- user accounts
- resident names
- resident phone numbers

## Best Practices

- Use clear issue descriptions.
- Keep service contact names and numbers up to date.
- Reset villa accounts when residents change.
- Use dashboard filters to spot recurring maintenance patterns.
- Upload contact photos where possible to make service identification easier.

## Summary

EM2 Resolve helps the community manage maintenance in a structured way.
It gives residents a simple reporting flow, gives admins better operational control,
and gives superadmin visibility and account recovery tools.
