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

// Function for asking user input
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

// Main function
async function main() {
  logger(banner, 'debug');

  const tokens = loadTokensFromFile('tokens.txt');
  const proxies = loadProxiesFromFile('proxy.txt');
  let type = await askQuestion(
    'Choose Your fishing type\n1. short_range\n2. mid_range\n3. long_range\nEnter your choice (1 2 3): '
  );

  if (proxies.length === 0) {
    logger('No proxies found. Exiting...', 'error');
    return;
  }

  let proxyIndex = 0;

  while (true) {
    let counter = 1;

    for (const token of tokens) {
      const { proxy, nextIndex } = getNextProxy(proxies, proxyIndex);
      proxyIndex = nextIndex;

      logger(`Using proxy: ${proxy}`);

      try {
        // Fetch user profile
        let profile = await getUserInfo(token, proxy);
        logger(`Profile response: ${JSON.stringify(profile)}`, 'debug');

        if (!profile) {
          logger(`Failed to fetch profile for Account #${counter}`, 'error');
          counter++;
          continue;
        }

        const { isCompleteTutorial, isClaimedDailyReward, gold, energy, fishPoint, id: userId } = profile;

        logger(`Account #${counter} | EXP Points: ${fishPoint} | Gold: ${gold} | Energy: ${energy}`, 'debug');

        if (!isCompleteTutorial) {
          // Complete tutorial if not done
          const tutorialResponse = await completeTutorial(token, proxy, userId);
          logger(`Complete tutorial response: ${JSON.stringify(tutorialResponse)}`, 'debug');
        } else if (!isClaimedDailyReward) {
          // Claim daily reward
          logger('Claiming daily reward...');
          const rewardResponse = await claimDailyReward(token, proxy);
          logger(`Daily reward response: ${JSON.stringify(rewardResponse)}`, 'debug');

          // Claim social quests
          const quests = await getSocialQuests(token, proxy);
          logger(`Social quests response: ${JSON.stringify(quests)}`, 'debug');

          const unclaimedQuestIds = quests
            .filter((quest) => quest.status === 'UnClaimed')
            .map((quest) => quest.id);

          for (const questId of unclaimedQuestIds) {
            if (['670f3bb8193d51c460247600', '670f3c40193d51c460247623', '670f3c76193d51c46024762c'].includes(questId)) {
              continue;
            }
            logger(`Claiming quest ID: ${questId}`, 'info');
            const questResponse = await verifyQuest(token, questId, proxy);
            logger(`Quest response: ${JSON.stringify(questResponse)}`, 'debug');
          }
        } else if (gold > 1500) {
          // Buy and use fishing item
          const itemId = '66b1f692aaa0b594511c2db2';
          const buyResponse = await buyFishing(token, proxy, itemId, userId);
          logger(`Buy item response: ${JSON.stringify(buyResponse)}`, 'debug');

          if (buyResponse) {
            logger(`Using item for user ${userId}`);
            const useResponse = await useItem(token, proxy, itemId, userId);
            logger(`Use item response: ${JSON.stringify(useResponse)}`, 'debug');
          }
        }

        // Fishing logic
        if (type === '1' && energy > 0) {
          const fishingResponse = await fishing(token, type, proxy);
          logger(`Fishing response: ${JSON.stringify(fishingResponse)}`, 'debug');
        } else if (type === '2' && energy > 1) {
          const fishingResponse = await fishing(token, type, proxy);
          logger(`Fishing response: ${JSON.stringify(fishingResponse)}`, 'debug');
        } else if (type === '3' && energy > 2) {
          const fishingResponse = await fishing(token, type, proxy);
          logger(`Fishing response: ${JSON.stringify(fishingResponse)}`, 'debug');
        } else {
          logger(`Not enough energy to start fishing. Checking inventory...`, 'warn');
          const inventory = await getInventory(token, proxy);
          logger(`Inventory response: ${JSON.stringify(inventory)}`, 'debug');
        }
      } catch (error) {
        logger(`Error in account #${counter}: ${JSON.stringify(error)}`, 'error');
      }

      counter++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger('Waiting 1 minute before fishing again...');
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }
}

main().catch((error) => {
  logger(`Main loop error: ${JSON.stringify(error)}`, 'error');
});
