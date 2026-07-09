import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private marketService: MarketService) {}

  @Get('stocks')
  async getStocks() {
    return this.marketService.getStocks();
  }

  @Post('scrape')
  @UseGuards(AuthGuard('jwt'))
  async triggerScrape() {
    await this.marketService.scrapeSikaFinance();
    return {
      message: 'Scraping executed successfully',
      stocks: this.marketService.getStocks()
    };
  }

  @Get('sgis')
  async getSgis() {
    return this.marketService.scrapeSgis();
  }
}
