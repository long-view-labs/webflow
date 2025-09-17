#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const semver = require("semver");
const chalk = require("chalk");
const inquirer = require("inquirer");

class ReleaseManager {
  constructor() {
    this.packageJsonPath = path.join(__dirname, "package.json");
    this.changelogPath = path.join(__dirname, "CHANGELOG.md");
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

  savePackageJson() {
    try {
      fs.writeFileSync(
        this.packageJsonPath,
        JSON.stringify(this.packageJson, null, 2) + "\n"
      );
    } catch (error) {
      console.error(chalk.red("Error saving package.json:", error.message));
      process.exit(1);
    }
  }

  getCurrentVersion() {
    return this.packageJson.version;
  }

  getNextVersion(type = "patch") {
    const currentVersion = this.getCurrentVersion();
    return semver.inc(currentVersion, type);
  }

  checkGitStatus() {
    try {
      const status = execSync("git status --porcelain", { encoding: "utf8" });
      if (status.trim()) {
        console.log(chalk.yellow("Warning: You have uncommitted changes:"));
        console.log(status);
        return false;
      }
      return true;
    } catch (error) {
      console.error(chalk.red("Error checking git status:", error.message));
      return false;
    }
  }

  checkBranch() {
    try {
      const branch = execSync("git branch --show-current", {
        encoding: "utf8",
      }).trim();
      if (branch !== "main" && branch !== "master") {
        console.log(
          chalk.yellow(
            `Warning: You are on branch '${branch}', not main/master`
          )
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error(chalk.red("Error checking git branch:", error.message));
      return false;
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

  async confirmRelease(currentVersion, nextVersion, type, notes) {
    console.log(chalk.blue("\nRelease Summary:"));
    console.log(chalk.gray(`Current version: ${currentVersion}`));
    console.log(chalk.green(`Next version: ${nextVersion}`));
    console.log(chalk.gray(`Release type: ${type}`));
    if (notes) {
      console.log(chalk.gray(`Release notes: ${notes}`));
    }

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Do you want to proceed with this release?",
        default: true,
      },
    ]);
    return confirm;
  }

  updateVersion(newVersion) {
    this.packageJson.version = newVersion;
    this.savePackageJson();
    console.log(chalk.green(`✓ Updated version to ${newVersion}`));
  }

  updateChangelog(version, notes) {
    const date = new Date().toISOString().split("T")[0];
    const changelogEntry = `## [${version}] - ${date}\n\n${
      notes || "No release notes provided."
    }\n\n`;

    let changelog = "";
    if (fs.existsSync(this.changelogPath)) {
      changelog = fs.readFileSync(this.changelogPath, "utf8");
    } else {
      changelog =
        "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n";
    }

    // Insert new entry after the header
    const lines = changelog.split("\n");
    const headerEndIndex = lines.findIndex((line) => line.startsWith("## ["));
    if (headerEndIndex === -1) {
      changelog = changelog + changelogEntry;
    } else {
      lines.splice(headerEndIndex, 0, changelogEntry);
      changelog = lines.join("\n");
    }

    fs.writeFileSync(this.changelogPath, changelog);
    console.log(chalk.green(`✓ Updated CHANGELOG.md`));
  }

  commitChanges(version) {
    try {
      execSync("git add package.json CHANGELOG.md", { stdio: "inherit" });
      execSync(`git commit -m "chore: bump version to ${version}"`, {
        stdio: "inherit",
      });
      console.log(chalk.green(`✓ Committed version bump`));
    } catch (error) {
      console.error(chalk.red("Error committing changes:", error.message));
      throw error;
    }
  }

  createTag(version, notes) {
    try {
      const tagMessage = notes
        ? `Release ${version}\n\n${notes}`
        : `Release ${version}`;
      execSync(`git tag -a v${version} -m "${tagMessage}"`, {
        stdio: "inherit",
      });
      console.log(chalk.green(`✓ Created tag v${version}`));
    } catch (error) {
      console.error(chalk.red("Error creating tag:", error.message));
      throw error;
    }
  }

  pushChanges() {
    try {
      execSync("git push origin main", { stdio: "inherit" });
      execSync("git push --tags", { stdio: "inherit" });
      console.log(chalk.green(`✓ Pushed changes and tags to remote`));
    } catch (error) {
      console.error(chalk.red("Error pushing changes:", error.message));
      throw error;
    }
  }

  async createGitHubRelease(version, notes) {
    try {
      const { createRelease } = await inquirer.prompt([
        {
          type: "confirm",
          name: "createRelease",
          message: "Do you want to create a GitHub release?",
          default: true,
        },
      ]);

      if (createRelease) {
        const releaseNotes = notes || `Release ${version}`;
        const command = `gh release create v${version} --title "Release ${version}" --notes "${releaseNotes}"`;
        execSync(command, { stdio: "inherit" });
        console.log(chalk.green(`✓ Created GitHub release v${version}`));
      }
    } catch (error) {
      console.log(
        chalk.yellow(
          "Note: GitHub CLI not available or not authenticated. Skipping GitHub release creation."
        )
      );
      console.log(
        chalk.gray(
          "You can create the release manually at: https://github.com/long-view-labs/webflow/releases"
        )
      );
    }
  }

  async release(type = null, notes = null) {
    console.log(chalk.blue("🚀 Starting release process...\n"));

    // Pre-flight checks
    if (!this.checkGitStatus()) {
      const { proceed } = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceed",
          message:
            "You have uncommitted changes. Do you want to proceed anyway?",
          default: false,
        },
      ]);
      if (!proceed) {
        console.log(chalk.yellow("Release cancelled."));
        return;
      }
    }

    if (!this.checkBranch()) {
      const { proceed } = await inquirer.prompt([
        {
          type: "confirm",
          name: "proceed",
          message:
            "You are not on main/master branch. Do you want to proceed anyway?",
          default: false,
        },
      ]);
      if (!proceed) {
        console.log(chalk.yellow("Release cancelled."));
        return;
      }
    }

    // Get release type if not provided
    if (!type) {
      type = await this.getReleaseType();
    }

    // Get release notes if not provided
    if (!notes) {
      notes = await this.getReleaseNotes();
    }

    const currentVersion = this.getCurrentVersion();
    const nextVersion = this.getNextVersion(type);

    // Confirm release
    const confirmed = await this.confirmRelease(
      currentVersion,
      nextVersion,
      type,
      notes
    );
    if (!confirmed) {
      console.log(chalk.yellow("Release cancelled."));
      return;
    }

    try {
      // Update version
      this.updateVersion(nextVersion);

      // Update changelog
      this.updateChangelog(nextVersion, notes);

      // Commit changes
      this.commitChanges(nextVersion);

      // Create tag
      this.createTag(nextVersion, notes);

      // Push changes
      this.pushChanges();

      // Create GitHub release
      await this.createGitHubRelease(nextVersion, notes);

      console.log(
        chalk.green(`\n🎉 Successfully released version ${nextVersion}!`)
      );
      console.log(chalk.blue(`\nNext steps:`));
      console.log(
        chalk.gray(
          `- Verify the release at: https://github.com/long-view-labs/webflow/releases`
        )
      );
      console.log(chalk.gray(`- Update any deployment scripts if needed`));
    } catch (error) {
      console.error(chalk.red("\n❌ Release failed:", error.message));
      console.log(chalk.yellow("\nYou may need to manually clean up:"));
      console.log(chalk.gray("- Revert the version in package.json"));
      console.log(chalk.gray("- Remove the changelog entry"));
      console.log(
        chalk.gray("- Reset the commit and tag if they were created")
      );
      process.exit(1);
    }
  }

  showVersion() {
    console.log(chalk.blue(`Current version: ${this.getCurrentVersion()}`));
  }

  showChangelog() {
    if (fs.existsSync(this.changelogPath)) {
      console.log(fs.readFileSync(this.changelogPath, "utf8"));
    } else {
      console.log(chalk.yellow("No CHANGELOG.md found."));
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const releaseManager = new ReleaseManager();

  switch (command) {
    case "patch":
    case "minor":
    case "major":
    case "prerelease":
      await releaseManager.release(command);
      break;
    case "version":
      releaseManager.showVersion();
      break;
    case "changelog":
      releaseManager.showChangelog();
      break;
    case "help":
    case "--help":
    case "-h":
      console.log(chalk.blue("Release Management Script"));
      console.log(chalk.gray("\nUsage:"));
      console.log(chalk.gray("  node release.js [command]"));
      console.log(chalk.gray("\nCommands:"));
      console.log(
        chalk.gray("  patch       Create a patch release (1.0.0 → 1.0.1)")
      );
      console.log(
        chalk.gray("  minor       Create a minor release (1.0.0 → 1.1.0)")
      );
      console.log(
        chalk.gray("  major       Create a major release (1.0.0 → 2.0.0)")
      );
      console.log(
        chalk.gray("  prerelease  Create a prerelease (1.0.0 → 1.0.1-0)")
      );
      console.log(chalk.gray("  version     Show current version"));
      console.log(chalk.gray("  changelog   Show changelog"));
      console.log(chalk.gray("  help        Show this help message"));
      console.log(
        chalk.gray(
          "\nIf no command is provided, an interactive release process will start."
        )
      );
      break;
    default:
      if (command) {
        console.log(chalk.red(`Unknown command: ${command}`));
        console.log(
          chalk.gray('Run "node release.js help" for usage information.')
        );
        process.exit(1);
      } else {
        await releaseManager.release();
      }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red("Unexpected error:", error.message));
    process.exit(1);
  });
}

module.exports = ReleaseManager;
