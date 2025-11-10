import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@flight-booking/types';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
