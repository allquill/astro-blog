import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOkResponse, ApiTags, PartialType } from '@nestjs/swagger';
import { Staff } from '../auth/guards';
import { SettingsDto } from './settings.dto';
import { SettingsService } from './settings.service';

class UpdateSettingsDto extends PartialType(SettingsDto) {}

@ApiTags('settings')
@Controller('api/admin/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Staff()
  @ApiOkResponse({ type: SettingsDto })
  get() {
    return this.settings.get();
  }

  @Put()
  @Staff('admin')
  @ApiOkResponse({ type: SettingsDto })
  update(@Body() body: UpdateSettingsDto) {
    return this.settings.update(body);
  }
}
