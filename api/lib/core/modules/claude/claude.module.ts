import { Module } from '@nestjs/common';
import { ClaudeCommandSelectorService } from '../../../logic/claude/claude-command-selector.service';
import { ClaudeCliService } from '../../../logic/claude/claude-cli.service';
import { ClaudeTelegramController } from '../../controllers/claude-telegram.controller';
import { TelegramService } from '../../services/telegram.service';
import { ConfigService } from '../../services/config.service';

@Module({
  controllers: [ClaudeTelegramController],
  providers: [
    ClaudeCommandSelectorService,
    ClaudeCliService,
    TelegramService,
    ConfigService,
  ],
  exports: [ClaudeCommandSelectorService, ClaudeCliService],
})
export class ClaudeModule {}
