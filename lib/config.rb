require 'yaml'

module BRS
  class Config

    attr_accessor :config

    # @param [Object] options
    def initialize(options)
      file = options[:config_path] || (File.dirname(__FILE__) + '/../config.yaml')

      unless File.exists? file
        raise "Configuration file [#{file}] doesn't exist"
      end

      @config = YAML::load(File.open(file))

      verify
    end

    def application
      @config['application']
    end

    def me
      @config['me']
    end

    def casual
      @config['casual']
    end

    def competition
      @config['competition']
    end

    def mail
      @config['mail']
    end

    #private

    def verify
      validate_section_exists :application
      validate_config_section application, %w(whichProfile login password smsLogin smsPassword smsAdmin)

      validate_section_exists :me
      validate_config_section me, %w(who player1UID player2UID player3UID player4UID player1SMS player2SMS player3SMS player4SMS mailRecipients dateComesAlive dateRequired teeTime intervals numRetries numNotLiveRetries)

      validate_section_exists :casual
      validate_config_section me, %w(who player1UID player2UID player3UID player4UID player1SMS player2SMS player3SMS player4SMS mailRecipients dateComesAlive dateRequired teeTime intervals numRetries numNotLiveRetries)

      validate_section_exists :competition
      validate_config_section me, %w(who player1UID player2UID player3UID player4UID player1SMS player2SMS player3SMS player4SMS mailRecipients dateComesAlive dateRequired teeTime intervals numRetries numNotLiveRetries)

      validate_section_exists :mail
      validate_config_section mail, %w(smtpServer adminEmail)

    end

    def validate_section_exists section_key
      section = send(section_key)
      if section.nil?
        raise "Missing #{section_key} configuration in config file."
      end
    end

    def validate_config_section section, entries
      entries.each do |config_key|
        entry = section[config_key]
        raise "Missing or empty configuration value for #{config_key}" if entry.nil? || entry.to_s.strip.empty?
      end
    end
  end
end