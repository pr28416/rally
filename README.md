# Rally AI

*Created by Pranav Ramesh, Dinesh Vasireddy, Nikita Mounier*

Rally AI is an AI platform that helps politicians connect with voters through personalized, AI-generated campaign advertisements. By leveraging cutting-edge AI technologies, Rally AI creates tailored video ads that address local issues and voter concerns, all while maintaining the authenticity of the politician's message and likeness.

## Table of Contents
- [Rally AI](#rally-ai)
  - [Table of Contents](#table-of-contents)
  - [Inspiration](#inspiration)
  - [What it does](#what-it-does)
  - [How we built it](#how-we-built-it)
  - [Agent Pipeline](#agent-pipeline)
  - [Legal Considerations](#legal-considerations)
  - [Challenges](#challenges)
  - [Accomplishments](#accomplishments)
  - [Lessons Learned](#lessons-learned)
  - [Future Plans](#future-plans)

## Inspiration

In an era of increasing political polarization and voter apathy, Rally AI aims to bridge the gap between politicians and their constituents. Our team, with extensive experience in community engagement and political campaigns, recognized the need for a tool that could help politicians effectively communicate their policies' impact on individual voters and their communities.

## What it does

Rally AI enables politicians and campaign teams to create geographically relevant, personalized campaign advertisements. The platform:

1. Analyzes the campaigner's policies
2. Cross-correlates them with issues voters care about
3. Generates AI-powered video advertisements using the politician's likeness
4. Delivers ads that speak directly to voters' concerns

## How we built it

Rally AI is a web app powered by a complex multi-agent chain system. It utilizes:

- [Supabase](https://supabase.com/) for storing data
- [Firecrawl](https://www.firecrawl.dev/) and [Perplexity API](https://docs.perplexity.ai/) for data scraping
- [GPT 4](https://openai.com/index/gpt-4/) for ad speech generation and B-roll planning
- [Cartesia.ai](https://cartesia.ai/)'s Sonic text-to-speech model for voice synthesis
- [Pexels](https://www.pexels.com/api/) for stock footage
- [SyncLabs](https://app.synclabs.so/) for lip-syncing
- [FFMPEG](https://www.ffmpeg.org/) for video post-processing
- [NextJS](https://nextjs.org/) for full-stack development
- [Vercel](https://vercel.com/) for deployment

All of this is packaged in a beautiful and modern UI, capable of generating personalized ads in just a few minutes.

## Agent Pipeline

Our ad generation process follows an 8-step pipeline:

1. **Data Aggregation Layer**: Collects campaign, voter, and current events data
2. **Voter Profile Input Layer**: Processes detailed voter profiles
3. **Campaign Policy Matching Layer**: Aligns voter issues with campaign policies
4. **Script Generation Layer**: Creates and refines ad scripts
5. **Ad Asset Generation Layer**: Produces voice-overs and B-roll footage
6. **Video Creation Layer**: Syncs voice with candidate video template
7. **Post-Processing Layer**: Overlays B-roll and finalizes the video
8. **Deployment**: Delivers a fully deployable political ad in under 4 minutes

## Legal Considerations

Rally AI operates within the bounds of current and proposed legislation regarding the use of AI personas in political campaigns. Our platform is designed for candidates to create non-libelous AI personas of themselves for campaign purposes, which is permitted under these regulations.

## Challenges

We faced several challenges during development, including:

- Integrating multiple new services with limited documentation
- Complex video manipulation using FFMPEG
- Balancing the need for speed with the desire for optimization

## Accomplishments

We're proud to have created a fully functional end-to-end voter-to-ad pipeline while also developing a beautiful web application. Despite the complexity of the project, our team successfully integrated all the necessary components.

## Lessons Learned

A key takeaway from this project was the importance of avoiding premature optimization. We learned that it's often better to implement solutions that work, even if they don't scale perfectly, rather than spending excessive time on optimizations that may not provide significant benefits.

## Future Plans

The potential for customized campaign material is vast. We envision expanding Rally AI into a more comprehensive solution for campaign ideation, testing, and crafting of various campaign materials, all powered by AI.

---

Rally AI: Bringing politicians and voters closer, one personalized ad at a time.
