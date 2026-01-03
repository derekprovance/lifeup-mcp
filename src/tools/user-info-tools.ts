/**
 * User information and character profile tools for MCP
 */

import { lifeupClient } from '../client/lifeup-client.js';
import * as Types from '../client/types.js';
import { ensureServerHealthy, handleToolError } from './tool-helpers.js';

export class UserInfoTools {
  /**
   * List all skills with their levels and progress
   */
  static async listSkills(): Promise<string> {
    try {
      await ensureServerHealthy();

      const skills = await lifeupClient.getSkills();

      if (skills.length === 0) {
        return 'No skills found. Create a task to start earning skill experience!';
      }

      let result = `## Skills\n\n`;
      result += `**Total Skills**: ${skills.length}\n\n`;

      skills.forEach((skill) => {
        result += `### ${skill.name}\n`;
        result += `**Level**: ${skill.level}\n`;
        result += `**Experience**: ${skill.experience} XP\n`;

        // Show progress to next level if available
        if (skill.untilNextLevelExp && skill.untilNextLevelExp > 0) {
          const progressPercent = Math.min(
            100,
            Math.round((skill.currentLevelExp / skill.untilNextLevelExp) * 100)
          );
          result += `**Progress**: ${skill.currentLevelExp}/${skill.untilNextLevelExp} XP (${progressPercent}%)\n`;
        }

        if (skill.description || skill.desc) {
          result += `${skill.description || skill.desc}\n`;
        }
        result += `\n`;
      });

      return result;
    } catch (error) {
      return handleToolError(error, 'fetching skills');
    }
  }

  /**
   * Get user profile information
   */
  static async getUserInfo(): Promise<string> {
    try {
      await ensureServerHealthy();

      const info = await lifeupClient.getInfo();

      if (!info) {
        return 'Unable to retrieve user information from the device.';
      }

      let result = `## User Profile\n\n`;

      if (info.playerName) {
        result += `**Player Name**: ${info.playerName}\n`;
      }

      if (info.level !== undefined) {
        result += `**Level**: ${info.level}\n`;
      }

      if (info.experience !== undefined) {
        result += `**Total Experience**: ${info.experience} XP\n`;
      }

      if (info.version) {
        result += `**LifeUp Version**: ${info.version}\n`;
      }

      // Add any other available properties
      const knownKeys = ['playerName', 'level', 'experience', 'version'];
      const otherKeys = Object.keys(info).filter((key) => !knownKeys.includes(key) && info[key] !== null && info[key] !== undefined);

      if (otherKeys.length > 0) {
        result += `\n### Additional Info\n`;
        otherKeys.forEach((key) => {
          result += `**${key}**: ${info[key]}\n`;
        });
      }

      return result;
    } catch (error) {
      return handleToolError(error, 'fetching user info');
    }
  }

  /**
   * Get coin balance and currency information
   */
  static async getCoinBalance(): Promise<string> {
    try {
      await ensureServerHealthy();

      const coinInfo = await lifeupClient.getCoinInfo();

      if (!coinInfo) {
        return 'Unable to retrieve coin information from the device.';
      }

      let result = `## Coin Balance\n\n`;

      // The API response structure may vary; display all available coin data
      if (typeof coinInfo === 'object') {
        // If coinInfo is an object with multiple properties (e.g., coin, balance, atm)
        if ('coin' in coinInfo) {
          result += `**Current Coins**: ${coinInfo.coin}\n`;
        }
        if ('balance' in coinInfo) {
          result += `**Balance**: ${coinInfo.balance}\n`;
        }
        if ('atm' in coinInfo) {
          result += `**ATM Balance**: ${coinInfo.atm}\n`;
        }

        // Display any other coin-related properties
        const mainKeys = ['coin', 'balance', 'atm'];
        const otherKeys = Object.keys(coinInfo).filter((key) => !mainKeys.includes(key) && coinInfo[key] !== null && coinInfo[key] !== undefined);

        if (otherKeys.length > 0) {
          otherKeys.forEach((key) => {
            result += `**${key}**: ${coinInfo[key]}\n`;
          });
        }
      } else if (typeof coinInfo === 'number') {
        // If API returns just a number
        result += `**Current Coins**: ${coinInfo}\n`;
      }

      return result;
    } catch (error) {
      return handleToolError(error, 'fetching coin balance');
    }
  }
}
