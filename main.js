import {
  loadTokensFromFile,
  loadProxiesFromFile
} from './utils/file.js';
import {
  getNextProxy
} from './utils/proxy.js';
import {
  getUserInfo,
  verifyQuest,
  getSocialQuests,
  claimDailyReward,
  buyFishing,
  useItem,
  completeTutorial,
  getInventory
} from './utils/api.js';
import {
  banner
} from './utils/banner.js';
import {
  logger
} from './utils/logger.js';
import {
  fishing
} from './utils/game.js';
import readline from 'readline';

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => rl.question(query, (answer) => {
    rl.close();
    resolve(answer);
  }));
};

async function main() {
  logger(banner, 'debug');
  const tokens = loadTokensFromFile('tokens.txt');
  const proxies = loadProxiesFromFile('proxy.txt');
  let type = await askQuestion(
    'Choose Your fishing type\n1. short_range  \n2. mid_range \n3. long_range \nEnter your choice (1 2 3): '
  );

  if (proxies.length === 0) {
    logger('No proxies found. Exiting...', 'error');
    return;
  }

  let proxyIndex = 0;

  while (true) {
    let counter = 1;
    for (const token of tokens) {
      const {
        proxy,
        nextIndex
      } = getNextProxy(proxies, proxyIndex);
      proxyIndex = nextIndex;

      logger(`Using proxy: ${proxy}`);
      let profile;
      try {
        profile = await getUserInfo(token, proxy);
        logger(`Profile response: ${JSON.stringify(profile)}`, 'debug');
      } catch (error) {
        logger(`Error fetching user info: ${JSON.stringify(error)}`, 'error');
        counter++;
        continue;
      }

      if (!profile) {
        logger(`Failed to fetch profile for Account #${counter}:`, 'error');
        counter++;
        continue;
      }

      const isCompleteTutorial = profile.isCompleteTutorial;
      const isClaimedDailyReward = profile.isClaimedDailyReward;
      const userId = profile.id;

      logger(
        `Account #${counter} | EXP Points: ${profile.fishPoint} | Gold: ${profile.gold} | Energy: ${profile.energy}`,
        'debug'
      );

      try {
        if (!isCompleteTutorial) {
          const tutorialResponse = await completeTutorial(token, proxy, userId);
          logger(`Complete tutorial response: ${JSON.stringify(tutorialResponse)}`, 'debug');
        } else if (!isClaimedDailyReward) {
          logger('Daily Signin...');
          const rewardResponse = await claimDailyReward(token, proxy);
          logger(`Claim daily reward response: ${JSON.stringify(rewardResponse)}`, 'debug');
          const quests = await getSocialQuests(token, proxy);
          logger(`Social quests response: ${JSON.stringify(quests)}`, 'debug');
          const ids = quests
            .filter((item) => item.status === 'UnClaimed')
            .map((item) => item.id);
          for (const id of ids) {
            if (
              id === '670f3bb8193d51c460247600' ||
              id === '670f3c40193d51c460247623' ||
              id === '670f3c76193d51c46024762c'
            ) {
              continue;
            }
            logger(`Account #${counter} | Claim Quests ID:`, 'info', id);
            const questResponse = await verifyQuest(token, id, proxy);
            logger(`Verify quest response: ${JSON.stringify(questResponse)}`, 'debug');
          }
        } else if (profile.gold > 1500) {
          const itemId = '66b1f692aaa0b594511c2db2';
          const buyResponse = await buyFishing(token, proxy, itemId, userId);
          logger(`Buy fishing item response: ${JSON.stringify(buyResponse)}`, 'debug');
          if (buyResponse) {
            logger(`Account #${counter} | Buy and Use Exp Scroll for user ${userId}`);
            const useResponse = await useItem(token, proxy, itemId, userId);
            logger(`Use item response: ${JSON.stringify(useResponse)}`, 'debug');
          }
        }

        if (type === '1' && profile.energy > 0) {
          const fishingResponse = await fishing(token, type, proxy);
          logger(`Fishing response: ${JSON.stringify(fishingResponse)}`, 'debug');
        } else if (type === '2' && profile.energy > 1) {
          const fishingResponse = await fishing(token, type, proxy);
          logger(`Fishing response: ${JSON.stringify(fishingResponse)}`, 'debug');
        } else if (type === '3' && profile.energy > 2) {
          const fishingResponse = await fishing(token, type, proxy);
          logger(`Fishing response: ${JSON.stringify(fishingResponse)}`, 'debug');
        } else {
          logger(
            `Account #${counter} | Not Enough Energy to start fishing...`,
            'warn'
          );
          logger(`Account #${counter} | Checking inventory...`);
          const inventory = await getInventory(token, proxy);
          logger(`Inventory response: ${JSON.stringify(inventory)}`, 'debug');
        }
      } catch (error) {
        logger(
          `Account #${counter} | Game failed: ${JSON.stringify(error)}`,
          'error'
        );
      }

      counter++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger('Waiting 1 minute before Fishing again...');
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }
}

main().catch((error) => {
  logger(`Error in main loop: ${JSON.stringify(error)}`, 'error');
});
