import { Controller, Get } from '@nestjs/common';
import { ReviewsService, Review } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  list(): Review[] {
    return this.reviewsService.list();
  }
}
