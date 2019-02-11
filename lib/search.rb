class Search

  def self.search(index, arr, forWhat)
    arr.each_with_index do |c, i|
      if (i >= index)
        if c =~ /#{forWhat}/
          return i
        end
      end
    end
    return 0
  end

  def self.string_search(theString, forWhat)
    if theString =~ /#{forWhat}/
      return true
    else
      return false
    end
  end

end
