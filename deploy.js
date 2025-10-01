#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const inquirer = require("inquirer");

class DeployManager {
  constructor() {
    this.packageJsonPath = path.join(__dirname, "package.json");
    this.packageJson = this.loadPackageJson();
  }

  loadPackageJson() {
    try {
      return JSON.parse(fs.readFileSync(this.packageJsonPath, "utf8"));
    } catch (error) {
      console.error(chalk.red("Error loading package.json:", error.message));
      process.exit(1);
    }
  }

  getCurrentVersion() {
    return this.packageJson.version;
  }

  checkGitStatus() {
    try {
      const status = execSync("git status --porcelain", { encoding: "utf8" });
      return status.trim();
    } catch (error) {
      console.error(chalk.red("Error checking git status:", error.message));
      return null;
    }
  }

  getStagedFiles() {
    try {
      const staged = execSync("git diff --cached --name-only", {
        encoding: "utf8",
      });
      return staged
        .trim()
        .split("\n")
        .filter((file) => file.length > 0);
    } catch (error) {
      return [];
    }
  }

  generateCommitMessage() {
    const stagedFiles = this.getStagedFiles();
    const unstagedChanges = this.checkGitStatus();

    // Analyze changes to generate a meaningful commit message
    let message = "feat: ";

    if (stagedFiles.length === 0 && unstagedChanges) {
      // No staged files, suggest adding all changes
      console.log(chalk.yellow("No staged files found. Available changes:"));
      console.log(chalk.gray(unstagedChanges));

      const { addAll } = inquirer.prompt([
        {
          type: "confirm",
          name: "addAll",
          message: "Do you want to add all changes?",
          default: true,
        },
      ]);

      if (addAll) {
        execSync("git add .", { stdio: "inherit" });
        stagedFiles.push(
          ...unstagedChanges.split("\n").map((line) => line.substring(3))
        );
      }
    }

    // Analyze file types and changes
    const hasNewFiles = stagedFiles.some((file) =>
      file.includes("home-search.js")
    );
    const hasJsChanges = stagedFiles.some((file) => file.endsWith(".js"));
    const hasPackageChanges =
      stagedFiles.includes("package.json") ||
      stagedFiles.includes("package-lock.json");

    if (hasNewFiles) {
      message =
        "feat: add new home-search functionality with payers API integration";
    } else if (hasJsChanges) {
      message = "feat: update search functionality and API integration";
    } else if (hasPackageChanges) {
      message = "chore: update dependencies";
    } else {
      message = "feat: update project files";
    }

    return message;
  }

  async getCommitMessage() {
    const suggestedMessage = this.generateCommitMessage();

    const { message } = await inquirer.prompt([
      {
        type: "input",
        name: "message",
        message: "Commit message:",
        default: suggestedMessage,
      },
    ]);

    return message;
  }

  async stageChanges() {
    try {
      console.log(chalk.blue("📁 Staging changes..."));
      execSync("git add .", { stdio: "inherit" });
      console.log(chalk.green("✓ Staged all changes"));
    } catch (error) {
      console.error(chalk.red("Error staging changes:", error.message));
      throw error;
    }
  }

  async getReleaseType() {
    const { type } = await inquirer.prompt([
      {
        type: "list",
        name: "type",
        message: "What type of release is this?",
        choices: [
          { name: "Patch (1.0.0 → 1.0.1) - Bug fixes", value: "patch" },
          { name: "Minor (1.0.0 → 1.1.0) - New features", value: "minor" },
          { name: "Major (1.0.0 → 2.0.0) - Breaking changes", value: "major" },
          {
            name: "Prerelease (1.0.0 → 1.0.1-0) - Alpha/Beta",
            value: "prerelease",
          },
        ],
      },
    ]);
    return type;
  }

  async getReleaseNotes() {
    const { notes } = await inquirer.prompt([
      {
        type: "input",
        name: "notes",
        message: "Enter release notes (optional):",
        default: "",
      },
    ]);
    return notes;
  }

  async commit(message) {
    try {
      console.log(chalk.blue("📝 Committing changes..."));
      execSync(`git commit -m "${message}"`, { stdio: "inherit" });
      console.log(chalk.green(`✓ Committed: ${message}`));
    } catch (error) {
      console.error(chalk.red("Error committing changes:", error.message));
      throw error;
    }
  }

  async push() {
    try {
      console.log(chalk.blue("📤 Pushing to remote..."));
      execSync("git push origin main", { stdio: "inherit" });
      console.log(chalk.green("✓ Pushed to remote"));
    } catch (error) {
      console.error(chalk.red("Error pushing changes:", error.message));
      throw error;
    }
  }

  async release(type, notes) {
    try {
      console.log(chalk.blue("🚀 Starting release process..."));
      execSync(`npm run release:${type}`, { stdio: "inherit" });
      console.log(chalk.green("✓ Release completed"));
    } catch (error) {
      console.error(chalk.red("Error during release:", error.message));
      throw error;
    }
  }

  async deploy() {
    console.log(chalk.blue("🚀 Starting deploy process...\n"));

    try {
      // Check git status
      const gitStatus = this.checkGitStatus();
      if (!gitStatus) {
        console.log(chalk.yellow("No changes to commit."));
        return;
      }

      // Stage all changes
      await this.stageChanges();

      // Get commit message
      const commitMessage = await this.getCommitMessage();

      // Commit changes
      await this.commit(commitMessage);

      // Get release type
      const releaseType = await this.getReleaseType();

      // Get release notes
      const releaseNotes = await this.getReleaseNotes();

      // Push changes
      await this.push();

      // Run release
      await this.release(releaseType, releaseNotes);

      console.log(chalk.green("\n🎉 Deploy completed successfully!"));
      console.log(chalk.blue(`\nSummary:`));
      console.log(chalk.gray(`- Committed: ${commitMessage}`));
      console.log(chalk.gray(`- Pushed to remote`));
      console.log(chalk.gray(`- Released: ${releaseType}`));
    } catch (error) {
      console.error(chalk.red("\n❌ Deploy failed:", error.message));
      console.log(chalk.yellow("\nYou may need to manually:"));
      console.log(chalk.gray("- Check git status"));
      console.log(chalk.gray("- Resolve any conflicts"));
      console.log(chalk.gray("- Retry the deploy"));
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const deployManager = new DeployManager();
  await deployManager.deploy();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red("Unexpected error:", error.message));
    process.exit(1);
  });
}

module.exports = DeployManager;
